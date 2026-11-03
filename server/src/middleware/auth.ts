import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { TokenPayload } from "../utils/token";
import { Role } from "../utils/roles";

export const protect = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  if (!token && typeof req.query?.token === "string" && req.query.token.trim()) {
    token = req.query.token.trim();
  }
  if (!token) {
    throw new AppError("You are not logged in.", 401);
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      throw new AppError("Token expired. Please refresh your session.", 401);
    }
    throw new AppError("Invalid session token. Please log in again.", 401);
  }

  const user = await User.findById(payload.id);
  if (!user || user.status !== "active") {
    throw new AppError("Account no longer exists or is inactive.", 401);
  }

  req.user = user;
  next();
});

export const protectOptional = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    const user = await User.findById(payload.id);
    if (user && user.status === "active") {
      req.user = user;
    }
  } catch {
    // Optional token parsing — proceed silently if token is invalid or expired
  }

  next();
});

export function restrictTo(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("You do not have permission to perform this action.", 403);
    }
    next();
  };
}
