import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";
import { User } from "../models/User.js";

export async function requireAuth(req, _res, next) {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ??
    req.query.token;

  if (!token) {
    return next(new AppError(401, "Authentication required."));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select("-password");

    if (!user) {
      return next(new AppError(401, "User session is no longer valid."));
    }

    req.user = user;
    next();
  } catch {
    next(new AppError(401, "Invalid authentication token."));
  }
}
