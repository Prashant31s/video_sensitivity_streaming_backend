import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const currentFilePath = fileURLToPath(import.meta.url);
const configDir = path.dirname(currentFilePath);
const backendRootDir = path.resolve(configDir, "../..");

dotenv.config({
  path: path.join(backendRootDir, ".env")
});

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/video-processing",
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_MB ?? 250) * 1024 * 1024,
  uploadDir: path.resolve(backendRootDir, process.env.UPLOAD_DIR ?? "uploads"),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiTranscriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1",
  openaiModerationModel: process.env.OPENAI_MODERATION_MODEL ?? "omni-moderation-latest",
  videoModerationFrameCount: Number(process.env.VIDEO_MODERATION_FRAME_COUNT ?? 8),
  videoModerationFrameWidth: Number(process.env.VIDEO_MODERATION_FRAME_WIDTH ?? 768),
  ffmpegPath: process.env.FFMPEG_PATH ?? "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH ?? "ffprobe"
};
