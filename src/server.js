import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { registerSocketHandlers } from "./socket/index.js";
import { attachProcessingSocket } from "./services/videoProcessing.service.js";

async function bootstrap() {
  await connectDatabase(env.mongodbUri);

  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: env.clientOrigin ,
      credentials: true
    }
  });

  registerSocketHandlers(io);
  attachProcessingSocket(io);

  server.listen(env.port, () => {
    console.log(`Backend server listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
