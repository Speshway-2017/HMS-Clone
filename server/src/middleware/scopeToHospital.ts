import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { Branch } from "../models/Branch";
import { Types } from "mongoose";

/**
 * Must run after `protect`. Restricts hospital_admin/accountant requests to
 * their own hospital and active branch; super_admin may optionally filter via ?hospitalId= or x-branch-id.
 */
export async function scopeToHospital(req: Request, _res: Response, next: NextFunction) {
  try {
    const branchHeader = (req.headers["x-branch-id"] || req.headers["x-branch"] || req.query.branchId || req.query.branch) as string | undefined;

    // Public / Unauthenticated requests (e.g. Landing Page, Public Doctor Directory, Public Booking)
    if (!req.user) {
      const hospitalId = req.query.hospitalId as string | undefined;
      // Landing page and public booking default to Main/Parent Hospital (branch: null)
      if (hospitalId) {
        req.hospitalFilter = { hospital: hospitalId, branch: null };
      } else {
        req.hospitalFilter = { branch: null };
      }
      return next();
    }

    if (req.user.role === "super_admin") {
      const hospitalId = req.query.hospitalId as string | undefined;
      const filter: any = {};
      if (hospitalId) filter.hospital = hospitalId;
      if (branchHeader && branchHeader !== "all" && branchHeader !== "main" && Types.ObjectId.isValid(branchHeader)) {
        filter.branch = branchHeader;
      } else if (branchHeader === "main") {
        filter.branch = null;
      }
      req.hospitalFilter = filter;
      return next();
    }

    if (!req.user.hospital) {
      if (req.user.role === "patient") {
        if (branchHeader && branchHeader !== "all" && branchHeader !== "main" && Types.ObjectId.isValid(branchHeader)) {
          req.hospitalFilter = { branch: branchHeader };
        } else {
          req.hospitalFilter = { branch: null };
        }
        return next();
      }
      throw new AppError("This account is not assigned to a hospital.", 403);
    }

    const baseFilter: any = { hospital: req.user.hospital };

    // Locked branch on User account (e.g. staff/doctor assigned to specific branch)
    if ((req.user as any).branch) {
      baseFilter.branch = (req.user as any).branch;
    } else if (branchHeader === "all") {
      // "all" explicitly requested by admin
      delete baseFilter.branch;
    } else if (branchHeader && branchHeader !== "main" && Types.ObjectId.isValid(branchHeader)) {
      const validBranch = await Branch.findOne({ _id: branchHeader, hospital: req.user.hospital });
      if (validBranch) {
        baseFilter.branch = validBranch._id;
      } else {
        baseFilter.branch = null;
      }
    } else {
      // Main hospital view (branchHeader is "main" or omitted)
      baseFilter.branch = null;
    }

    req.hospitalFilter = baseFilter;
    next();
  } catch (err) {
    next(err);
  }
}
