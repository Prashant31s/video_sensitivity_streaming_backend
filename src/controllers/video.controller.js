import fs from "fs";
import { AppError } from "../lib/AppError.js";
import { Video } from "../models/Video.js";
import { serializeVideo, startVideoProcessing } from "../services/videoProcessing.service.js";
import { parseRange } from "../utils/range.js";

export async function uploadVideo(req, res) {
  if (!req.file) {
    throw new AppError(400, "Video file is required.");
  }

  const { title, description, category, sensitivityStatus } = req.body;

  const video = await Video.create({
    title: title || req.file.originalname,
    description: description ?? "",
    category: category ?? "General",
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    filePath: req.file.path,
    uploadedBy: req.user._id,
    organizationId: req.user.organizationId
  });

  startVideoProcessing(video._id.toString()).catch(() => {});

  res.status(201).json({ video: serializeVideo(video) });
}

export async function listVideos(req, res) {
  const { processingStatus, sensitivityStatus, q, category } = req.query;

  const filters = {
    organizationId: req.user.organizationId
  };

  if (processingStatus) {
    filters.processingStatus = processingStatus;
  }

  if (sensitivityStatus) {
    filters.sensitivityStatus = sensitivityStatus;
  }

  if (category) {
    filters.category = category;
  }

  if (q) {
    filters.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { originalName: { $regex: q, $options: "i" } }
    ];
  }

  const videos = await Video.find(filters).sort({ createdAt: -1 });
  res.json({ videos: videos.map(serializeVideo) });
}

export async function getVideo(req, res) {
  const video = await Video.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId
  });

  if (!video) {
    throw new AppError(404, "Video not found.");
  }

  res.json({ video: serializeVideo(video) });
}

export async function updateVideo(req, res) {
  const video = await Video.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId
  });

  if (!video) {
    throw new AppError(404, "Video not found.");
  }

  const { title, description, category, sensitivityStatus } = req.body;
  if (title !== undefined) {
    video.title = title;
  }
  if (description !== undefined) {
    video.description = description;
  }
  if (category !== undefined) {
    video.category = category;
  }
  if (sensitivityStatus !== undefined) {
    video.sensitivityStatus = sensitivityStatus;
  }

  await video.save();

  res.json({ video: serializeVideo(video) });
}

export async function streamVideo(req, res) {
  const video = await Video.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId
  });

  if (!video) {
    throw new AppError(404, "Video not found.");
  }

  if (video.processingStatus !== "ready") {
    throw new AppError(409, "Video is still processing.");
  }

  const streamPath = video.optimizedFilePath || video.filePath;
  const streamMimeType = video.optimizedMimeType || video.mimeType;
  const stats = fs.statSync(streamPath);
  const range = parseRange(req.headers.range, stats.size);

  if (!range) {
    res.writeHead(200, {
      "Content-Length": stats.size,
      "Content-Type": streamMimeType,
      "Accept-Ranges": "bytes"
    });

    fs.createReadStream(streamPath).pipe(res);
    return;
  }

  const chunkSize = range.end - range.start + 1;
  res.writeHead(206, {
    "Content-Range": `bytes ${range.start}-${range.end}/${stats.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": streamMimeType
  });

  fs.createReadStream(streamPath, {
    start: range.start,
    end: range.end
  }).pipe(res);
}
