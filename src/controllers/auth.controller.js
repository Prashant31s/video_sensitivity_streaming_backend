import { AppError } from "../lib/AppError.js";
import { User } from "../models/User.js";
import { signToken } from "../services/token.service.js";

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId
  };
}

export async function register(req, res) {
  const { name, email, password, organizationId, role } = req.body;

  if (!name || !email || !password || !organizationId) {
    throw new AppError(400, "Name, email, password, and organization ID are required.");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError(409, "A user with this email already exists.");
  }

  const user = await User.create({
    name,
    email,
    password,
    organizationId,
    role: role ?? "admin"
  });

  const token = signToken(user);

  res.status(201).json({
    token,
    user: sanitizeUser(user)
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) {
    throw new AppError(401, "Invalid email or password.");
  }

  const isValidPassword = await user.comparePassword(password ?? "");
  if (!isValidPassword) {
    throw new AppError(401, "Invalid email or password.");
  }

  const token = signToken(user);

  res.json({
    token,
    user: sanitizeUser(user)
  });
}

export async function me(req, res) {
  res.json({ user: sanitizeUser(req.user) });
}
