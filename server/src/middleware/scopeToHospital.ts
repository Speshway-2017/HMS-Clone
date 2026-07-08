import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

/**
 * Must run after `protect`. Restricts hospital_admin/accountant requests to
 * their own hospital; super_admin may optionally filter via ?hospitalId=,
 * or omit it to see data across every hospital.
 */
export function scopeToHospital(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AppError("You are not logged in.", 401);
  }

  if (req.user.role === "super_admin") {
    const hospitalId = req.query.hospitalId as string | undefined;
    req.hospitalFilter = hospitalId ? { hospital: hospitalId } : {};
    return next();
  }

  if (!req.user.hospital) {
    throw new AppError("This account is not assigned to a hospital.", 403);
  }

  req.hospitalFilter = { hospital: req.user.hospital };
  next();
}
