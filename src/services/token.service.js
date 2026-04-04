import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      organizationId: user.organizationId,
      name: user.name,
      email: user.email
    },
    env.jwtSecret,
    {
      expiresIn: "7d"
    }
  );
}
