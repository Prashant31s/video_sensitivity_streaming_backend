import { AppError } from "../lib/AppError.js";
import { User } from "../models/User.js";

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    createdAt: user.createdAt
  };
}

export async function listUsers(req, res) {
  const users = await User.find({ organizationId: req.user.organizationId })
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({ users: users.map(sanitizeUser) });
}

export async function createUser(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    throw new AppError(400, "Name, email, password, and role are required.");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError(409, "A user with this email already exists.");
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    organizationId: req.user.organizationId
  });

  res.status(201).json({ user: sanitizeUser(user) });
}
