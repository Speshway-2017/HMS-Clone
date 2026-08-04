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

    if (!req.user) {
      const hospitalId = req.query.hospitalId as string | undefined;
      req.hospitalFilter = hospitalId ? { hospital: hospitalId } : {};
      return next();
    }

    if (req.user.role === "super_admin") {
      const hospitalId = req.query.hospitalId as string | undefined;
      const filter: any = {};
      if (hospitalId) filter.hospital = hospitalId;
      if (branchHeader && branchHeader !== "all" && branchHeader !== "main" && Types.ObjectId.isValid(branchHeader)) {
        filter.branch = branchHeader;
      }
      req.hospitalFilter = filter;
      return next();
    }

    if (!req.user.hospital) {
      if (req.user.role === "patient") {
        req.hospitalFilter = {};
        return next();
      }
      throw new AppError("This account is not assigned to a hospital.", 403);
    }

    const baseFilter: any = { hospital: req.user.hospital };

    // If user has an assigned branch on their account (staff/doctor/receptionist)
    if ((req.user as any).branch) {
      baseFilter.branch = (req.user as any).branch;
    } else if (branchHeader && branchHeader !== "all" && branchHeader !== "main" && Types.ObjectId.isValid(branchHeader)) {
      const validBranch = await Branch.findOne({ _id: branchHeader, hospital: req.user.hospital });
      if (validBranch) {
        baseFilter.branch = validBranch._id;
      } else {
        baseFilter.branch = null;
      }
    } else {
      // Main hospital view (main branch) -> filter strictly by branch: null so child branch data never overlaps!
      baseFilter.branch = null;
    }

    req.hospitalFilter = baseFilter;
    next();
  } catch (err) {
    next(err);
  }
}
