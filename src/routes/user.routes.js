import { Router } from "express";
import { createUser, listUsers } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const userRouter = Router();

userRouter.use(requireAuth, requirePermission("users:manage"));
userRouter.get("/", asyncHandler(listUsers));
userRouter.post("/", asyncHandler(createUser));
