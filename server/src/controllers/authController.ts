import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User, UserDocument } from "../models/User";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { signToken } from "../utils/token";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function sanitizeUser(user: UserDocument) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    hospital: user.hospital,
    avatarUrl: user.avatarUrl,
    status: user.status,
    lastLogin: user.lastLogin,
  };
}

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Incorrect email or password.", 401);
  }
  if (user.status !== "active") {
    throw new AppError("This account has been deactivated.", 403);
  }

  user.lastLogin = new Date();
  await user.save();

  const token = signToken({ id: user._id.toString(), role: user.role });

  res.status(200).json({ status: "success", data: { user: sanitizeUser(user), token } });
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  // Stateless JWT — the client discards its token. Nothing to invalidate server-side.
  res.status(200).json({ status: "success", data: null });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  res.status(200).json({ status: "success", data: { user: sanitizeUser(req.user!) } });
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(1, "New password is required."),
  confirmPassword: z.string().min(1, "Please confirm your new password."),
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { newPassword, confirmPassword } = changePasswordSchema.parse(req.body);

  if (newPassword !== confirmPassword) {
    throw new AppError("New password and confirmation do not match.", 400);
  }

  const user = await User.findById(req.user!._id).select("+passwordHash");
  if (!user) throw new AppError("User not found.", 404);

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.status(200).json({ status: "success", data: { message: "Password changed successfully." } });
});
