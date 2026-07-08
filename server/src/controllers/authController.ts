import { Request, Response } from "express";
import { z } from "zod";
import { User, UserDocument } from "../models/User";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { signToken, setAuthCookie, clearAuthCookie } from "../utils/token";

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
  setAuthCookie(res, token);

  res.status(200).json({ status: "success", data: { user: sanitizeUser(user) } });
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(200).json({ status: "success", data: null });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  res.status(200).json({ status: "success", data: { user: sanitizeUser(req.user!) } });
});
