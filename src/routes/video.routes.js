import { Router } from "express";
import {
  getVideo,
  listVideos,
  streamVideo,
  updateVideo,
  uploadVideo
} from "../controllers/video.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { upload } from "../services/storage.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const videoRouter = Router();

videoRouter.use(requireAuth);
videoRouter.get("/", asyncHandler(listVideos));
videoRouter.get("/:id", asyncHandler(getVideo));
videoRouter.get("/:id/stream", asyncHandler(streamVideo));
videoRouter.post("/", requirePermission("videos:create"), upload.single("video"), asyncHandler(uploadVideo));
videoRouter.patch("/:id", requirePermission("videos:update"), asyncHandler(updateVideo));
