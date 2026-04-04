import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";
import { env } from "../config/env.js";
import { Video } from "../models/Video.js";

const execFileAsync = promisify(execFile);

let ioInstance;
let openaiClient;

export function attachProcessingSocket(io) {
  ioInstance = io;
}

function getOpenAIClient() {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: env.openaiApiKey });
  }

  return openaiClient;
}

function emitToOrg(organizationId, event, payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(`org:${organizationId}`).emit(event, payload);
}

async function updateProcessingState(video, updates, eventName = "video:progress") {
  Object.assign(video, updates);
  await video.save();
  emitToOrg(video.organizationId, eventName, serializeVideo(video));
}

async function probeDurationSeconds(videoPath) {
  const { stdout } = await execFileAsync(env.ffprobePath, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    videoPath
  ]);

  const durationSeconds = Number.parseFloat(stdout.trim());
  return Number.isFinite(durationSeconds) ? durationSeconds : 0;
}

async function hasAudioStream(videoPath) {
  const { stdout } = await execFileAsync(env.ffprobePath, [
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "stream=codec_type",
    "-of",
    "csv=p=0",
    videoPath
  ]);

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .some((line) => line === "audio");
}

async function extractAudioTrack(videoPath, audioPath) {
  await execFileAsync(env.ffmpegPath, [
    "-y",
    "-i",
    videoPath,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    audioPath
  ]);
}

function createOptimizedVideoPath(video) {
  const parsedPath = path.parse(video.filePath);
  return path.join(parsedPath.dir, `${parsedPath.name}-stream.mp4`);
}

async function optimizeVideoForStreaming(inputPath, outputPath) {
  await execFileAsync(env.ffmpegPath, [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-vf",
    "scale=1920:1080:force_original_aspect_ratio=decrease",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    outputPath
  ]);
}

async function extractModerationFrames(videoPath, framesDir, durationSeconds) {
  const frameCount = Math.max(1, env.videoModerationFrameCount);
  const frameWidth = Math.max(240, env.videoModerationFrameWidth);
  const intervalSeconds = Math.max(durationSeconds / frameCount, 1);
  const outputPattern = path.join(framesDir, "frame-%02d.jpg");

  await execFileAsync(env.ffmpegPath, [
    "-y",
    "-i",
    videoPath,
    "-vf",
    `fps=1/${intervalSeconds},scale=${frameWidth}:-1`,
    "-frames:v",
    String(frameCount),
    outputPattern
  ]);

  const frameFiles = await fs.promises.readdir(framesDir);
  return frameFiles
    .filter((file) => file.endsWith(".jpg"))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => path.join(framesDir, file));
}

async function encodeImageAsDataUrl(imagePath) {
  const imageBytes = await fs.promises.readFile(imagePath);
  return `data:image/jpeg;base64,${imageBytes.toString("base64")}`;
}

function isModerationFlagged(moderationResponse) {
  console.log("Moderation response:", JSON.stringify(moderationResponse.results));
  const result = moderationResponse.results?.[0];
  return result?.flagged === true;
}

async function transcribeAudio(audioPath) {
  const client = getOpenAIClient();
  const transcription = await client.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: env.openaiTranscriptionModel,
    response_format: "verbose_json"
  });

  return {
    text: transcription.text?.trim() ?? "",
    durationSeconds: Number.isFinite(transcription.duration) ? transcription.duration : 0
  };
}

function buildModerationInput(video, transcript) {
  return [
    `Title: ${video.title}`,
    `Description: ${video.description || "None"}`,
    `Category: ${video.category || "General"}`,
    `Transcript: ${transcript || "No speech detected"}`
  ].join("\n");
}

async function moderateVideoContent(video, transcript, framePaths) {
  const client = getOpenAIClient();
  const textModeration = await client.moderations.create({
    model: env.openaiModerationModel,
    input: [
      {
        type: "text",
        text: buildModerationInput(video, transcript)
      }
    ]
  });
  console.log("Text moderation result:", JSON.stringify(textModeration.results));
  if (isModerationFlagged(textModeration)) {
    return "flagged";
  }
  console.log("Video text content passed moderation. Proceeding to frame analysis...", framePaths);
  for (const framePath of framePaths) {
    const frameModeration = await client.moderations.create({
      model: env.openaiModerationModel,
      input: [
        {
          type: "image_url",
          image_url: {
            url: await encodeImageAsDataUrl(framePath)
          }
        }
      ]
    });
    console.log(`Moderation result for frame ${framePath}:`, JSON.stringify(frameModeration.results));

    if (isModerationFlagged(frameModeration)) {
      return "flagged";
    }
  }

  return "safe";
}

async function createTempAudioPath(videoId) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `video-processing-${videoId}-`));
  return {
    tempDir,
    audioPath: path.join(tempDir, "audio.wav"),
    framesDir: path.join(tempDir, "frames")
  };
}

async function cleanupTempDir(tempDir) {
  if (!tempDir) {
    return;
  }

  await fs.promises.rm(tempDir, { recursive: true, force: true });
}

export async function startVideoProcessing(videoId) {
  const video = await Video.findById(videoId);

  if (!video) {
    return;
  }

  let tempDir;

  try {
    await updateProcessingState(video, {
      processingStatus: "processing",
      processingProgress: 10,
      sensitivityStatus: "pending"
    });

    const probedDuration = await probeDurationSeconds(video.filePath);
    video.durationSeconds = probedDuration;
    await updateProcessingState(video, {
      durationSeconds: probedDuration,
      processingProgress: 25
    });

    const optimizedVideoPath = createOptimizedVideoPath(video);
    await optimizeVideoForStreaming(video.filePath, optimizedVideoPath);
    const optimizedStats = await fs.promises.stat(optimizedVideoPath);
    await updateProcessingState(video, {
      optimizedFilename: path.basename(optimizedVideoPath),
      optimizedMimeType: "video/mp4",
      optimizedFileSize: optimizedStats.size,
      optimizedFilePath: optimizedVideoPath,
      processingProgress: 40
    });

    const tempPaths = await createTempAudioPath(video._id.toString());
    tempDir = tempPaths.tempDir;
    await fs.promises.mkdir(tempPaths.framesDir, { recursive: true });

    let transcript = "";
    let durationSeconds = probedDuration;
    const audioAvailable = await hasAudioStream(video.filePath);
    const framePaths = await extractModerationFrames(video.filePath, tempPaths.framesDir, probedDuration);

    if (audioAvailable) {
      await extractAudioTrack(video.filePath, tempPaths.audioPath);
      await updateProcessingState(video, {
        processingProgress: 55
      });

      const transcription = await transcribeAudio(tempPaths.audioPath);
      transcript = transcription.text;
      durationSeconds = transcription.durationSeconds || probedDuration;
    } else {
      await updateProcessingState(video, {
        transcript: "",
        processingProgress: 65
      });
    }

    await updateProcessingState(video, {
      transcript,
      durationSeconds,
      processingProgress: 80
    });

    const sensitivityStatus = await moderateVideoContent(video, transcript, framePaths);

    await updateProcessingState(
      video,
      {
        sensitivityStatus,
        processingStatus: "ready",
        processingProgress: 100
      },
      "video:completed"
    );
  } catch (error) {
    console.error("Video processing failed:", error);

    await updateProcessingState(
      video,
      {
        processingStatus: "failed",
        processingProgress: 100
      },
      "video:completed"
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
}

export function serializeVideo(video) {
  return {
    id: video._id.toString(),
    title: video.title,
    description: video.description,
    category: video.category,
    filename: video.filename,
    originalName: video.originalName,
    mimeType: video.mimeType,
    fileSize: video.fileSize,
    optimizedFilename: video.optimizedFilename,
    optimizedMimeType: video.optimizedMimeType,
    optimizedFileSize: video.optimizedFileSize,
    durationSeconds: video.durationSeconds,
    transcript: video.transcript,
    processingStatus: video.processingStatus,
    processingProgress: video.processingProgress,
    sensitivityStatus: video.sensitivityStatus,
    uploadedBy: video.uploadedBy,
    organizationId: video.organizationId,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt
  };
}
