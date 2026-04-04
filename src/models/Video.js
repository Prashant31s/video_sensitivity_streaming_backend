import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    category: {
      type: String,
      trim: true,
      default: "General"
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    optimizedFilename: {
      type: String,
      default: ""
    },
    optimizedMimeType: {
      type: String,
      default: ""
    },
    optimizedFileSize: {
      type: Number,
      default: 0
    },
    optimizedFilePath: {
      type: String,
      default: ""
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    transcript: {
      type: String,
      default: ""
    },
    processingStatus: {
      type: String,
      enum: ["uploaded", "processing", "ready", "failed"],
      default: "uploaded",
      index: true
    },
    processingProgress: {
      type: Number,
      default: 0
    },
    sensitivityStatus: {
      type: String,
      enum: ["pending", "safe", "flagged"],
      default: "pending",
      index: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    organizationId: {
      type: String,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Video = mongoose.model("Video", videoSchema);
