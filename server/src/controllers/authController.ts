import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { User, UserDocument } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/token";
import { logAudit } from "../utils/auditLogger";

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

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    await logAudit({
      req,
      userEmail: email,
      action: "LOGIN_FAILED",
      entity: "User",
      details: { reason: "Invalid credentials" },
    });
    throw new AppError("Incorrect email or password.", 401);
  }
  if (user.status !== "active") {
    await logAudit({
      req,
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: "LOGIN_BLOCKED",
      entity: "User",
      details: { reason: "User account inactive" },
    });
    throw new AppError("This account has been deactivated.", 403);
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ id: user._id.toString(), role: user.role });

  // Store refresh token in DB
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });

  await logAudit({
    req,
    userId: user._id.toString(),
    userEmail: user.email,
    userRole: user.role,
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: user._id.toString(),
  });

  res.status(200).json({
    status: "success",
    data: {
      user: sanitizeUser(user),
      token: accessToken,
      refreshToken: refreshToken,
    },
  });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const incomingToken = req.body.refreshToken || req.headers["x-refresh-token"];
  if (!incomingToken || typeof incomingToken !== "string") {
    throw new AppError("Refresh token is required.", 401);
  }

  let payload;
  try {
    payload = verifyRefreshToken(incomingToken);
  } catch {
    throw new AppError("Invalid or expired refresh token. Please log in again.", 401);
  }

  const tokenHash = hashToken(incomingToken);
  const storedToken = await RefreshToken.findOne({
    user: payload.id,
    tokenHash,
    isRevoked: false,
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError("Session expired or revoked. Please log in again.", 401);
  }

  // Revoke old refresh token (rotation)
  storedToken.isRevoked = true;
  await storedToken.save();

  const user = await User.findById(payload.id);
  if (!user || user.status !== "active") {
    throw new AppError("Account no longer exists or is inactive.", 401);
  }

  // Issue new access token + new refresh token
  const newAccessToken = signAccessToken({ id: user._id.toString(), role: user.role });
  const newRefreshToken = signRefreshToken({ id: user._id.toString(), role: user.role });
  const newHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash: newHash,
    expiresAt,
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });

  res.status(200).json({
    status: "success",
    data: {
      token: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const incomingToken = req.body?.refreshToken || req.headers["x-refresh-token"];
  if (incomingToken && typeof incomingToken === "string") {
    const tokenHash = hashToken(incomingToken);
    await RefreshToken.updateMany({ tokenHash }, { isRevoked: true });
  }

  if (req.user) {
    await RefreshToken.updateMany({ user: req.user._id }, { isRevoked: true });
    await logAudit({
      req,
      action: "LOGOUT",
      entity: "User",
      entityId: req.user._id.toString(),
    });
  }

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

  // Invalidate previous refresh tokens on password change
  await RefreshToken.updateMany({ user: user._id }, { isRevoked: true });

  await logAudit({
    req,
    action: "CHANGE_PASSWORD",
    entity: "User",
    entityId: user._id.toString(),
  });

  res.status(200).json({ status: "success", data: { message: "Password changed successfully." } });
});
