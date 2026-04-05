# Backend

This is the Node.js + Express backend for the video processing platform. It provides authentication, role-based access control, video upload and streaming APIs, live processing updates over Socket.IO, and background moderation/transcription orchestration.

## Features

- User registration and login with JWT authentication
- Role-based permissions for viewers, editors, and admins
- Video upload API with a 10 MB file size limit
- Video listing, filtering, update, and secure streaming endpoints
- Organization-aware data access
- Socket.IO events for live processing status updates
- MongoDB persistence for users and videos
- OpenAI-powered transcription and moderation workflow hooks

## Tech Stack

- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- Multer
- OpenAI SDK

## Requirements

- Node.js 18+
- npm
- MongoDB instance
- `ffmpeg` and `ffprobe` available on the system path, or configured explicitly

## Environment Variables

Create `backend/.env` with values like:
for local
```env 
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/video-processing
JWT_SECRET=replace-this-secret
CLIENT_ORIGIN=http://localhost:5173
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=uploads
OPENAI_API_KEY=
OPENAI_TRANSCRIPTION_MODEL=whisper-1
OPENAI_MODERATION_MODEL=omni-moderation-latest
VIDEO_MODERATION_FRAME_COUNT=8
VIDEO_MODERATION_FRAME_WIDTH=768
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
```


## Install

```bash
npm install
```

## Run Locally

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The API listens on `http://localhost:4000` by default.

## Scripts

- `npm run dev` starts the server with file watching
- `npm start` starts the server normally
- `npm test` runs the Node test suite


## Notes

- Video uploads accept only `video/*` MIME types.
- Uploads larger than 10 MB are rejected by Multer.
- CORS and Socket.IO origins are controlled by `CLIENT_ORIGIN`.
- Uploaded files are stored in `UPLOAD_DIR`.
- Streaming is available only after processing status becomes `ready`.
