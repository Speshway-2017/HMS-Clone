import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { Branch } from "../models/Branch";
import { User } from "../models/User";
import { Types } from "mongoose";
import { getDataScope } from "../utils/dataScope";

/**
 * Must run after `protect`. Restricts user requests to their own hospital and active branch.
 */
export async function scopeToHospital(req: Request, _res: Response, next: NextFunction) {
  try {
    const branchHeader = (req.headers["x-branch-id"] || req.headers["x-branch"] || req.query.branchId || req.query.branch) as string | undefined;

    // Public / Unauthenticated requests
    if (!req.user) {
      const hospitalId = req.query.hospitalId as string | undefined;
      if (hospitalId && Types.ObjectId.isValid(hospitalId)) {
        const hId = new Types.ObjectId(hospitalId);
        req.hospitalFilter = { hospital: hId, branch: null };
        req.tenantContext = {
          hospitalId: hId,
          branchId: null,
          isBranchScoped: true,
          queryFilter: { hospital: hId, branch: null }
        };
      } else {
        req.hospitalFilter = { hospital: null as any, branch: null };
        req.tenantContext = {
          hospitalId: null as any,
          branchId: null,
          isBranchScoped: false,
          queryFilter: { hospital: null as any, branch: null }
        };
      }
      return next();
    }

    let userBranch = (req.user as any).branch;

    // Resolve branch if missing on user document from Staff or Doctor
    if (!userBranch && req.user.role !== "hospital_admin" && req.user.role !== "super_admin") {
      const { Staff } = await import("../models/Staff");
      const { Doctor } = await import("../models/Doctor");

      const emailRegex = req.user.email ? new RegExp(`^${req.user.email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") : null;
      const staff = await Staff.findOne({ user: req.user._id }) || (emailRegex ? await Staff.findOne({ email: emailRegex }) : null);
      if (staff && staff.branch) {
        userBranch = staff.branch;
      } else {
        const doctor = await Doctor.findOne({ user: req.user._id }) || (emailRegex ? await Doctor.findOne({ email: emailRegex }) : null);
        if (doctor && doctor.branch) {
          userBranch = doctor.branch;
        }
      }

      if (userBranch) {
        (req.user as any).branch = userBranch;
        await User.updateOne({ _id: req.user._id }, { branch: userBranch }).catch(() => {});
      }
    }

    const tenantScope = getDataScope(req);

    // Re-verify active branch ownership if selected branch header passed
    if (tenantScope.branchId && req.user.role === "hospital_admin") {
      const validBranch = await Branch.findOne({ _id: tenantScope.branchId, hospital: tenantScope.hospitalId });
      if (!validBranch) {
        throw new AppError("Forbidden: Selected branch is invalid or unauthorized for your hospital.", 403);
      }
    }

    // Multi-branch read-only enforcement:
    // Super Admin and Hospital Admins have full operational authority over their facilities and are never restricted.
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      const isGlobalHospitalRoute = req.originalUrl.includes("/branches") || req.originalUrl.includes("/hospitals") || req.originalUrl.includes("/auth/");
      if (!isGlobalHospitalRoute) {
        if (branchHeader === "all" && req.user.role !== "super_admin" && req.user.role !== "hospital_admin" && req.user.role !== "admin") {
          throw new AppError("Action forbidden in aggregated view mode. Please select a specific branch context to perform changes.", 403);
        }
      }
    }

    req.tenantContext = tenantScope;

    // Preserve full filter object for backwards compatibility with existing controllers
    const filterObj: any = { hospital: tenantScope.hospitalId };
    if (tenantScope.branchId !== undefined && tenantScope.branchId !== null) {
      filterObj.branch = tenantScope.branchId;
    } else if (tenantScope.isBranchScoped && tenantScope.branchId === null) {
      filterObj.branch = null;
    }
    req.hospitalFilter = filterObj;

    next();
  } catch (err) {
    next(err);
  }
}
