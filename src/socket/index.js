import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication token is required."));
      }

      const payload = jwt.verify(token, env.jwtSecret);
      socket.user = payload;
      next();
    } catch {
      next(new Error("Invalid socket token."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`org:${socket.user.organizationId}`);

    socket.emit("socket:ready", {
      organizationId: socket.user.organizationId
    });
  });
}
