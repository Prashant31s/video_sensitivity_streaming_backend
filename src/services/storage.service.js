import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  }
});

function fileFilter(_req, file, cb) {
  if (!file.mimetype.startsWith("video/")) {
    cb(new AppError(400, "Only video uploads are allowed."));
    return;
  }

  cb(null, true);
}

export const upload = multer({
  storage,
  limits: {
    fileSize: env.maxFileSizeBytes
  },
  fileFilter
});

export function resolveVideoPath(filename) {
  return path.join(env.uploadDir, filename);
}
