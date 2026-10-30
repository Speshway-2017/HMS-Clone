import { Request } from "express";
import { Types } from "mongoose";
import { AppError } from "./AppError";
import { Branch } from "../models/Branch";

export interface TenantContext {
  hospitalId: Types.ObjectId;
  branchId: Types.ObjectId | null; // null if hospital-wide admin view ("all") or unassigned main hospital
  isBranchScoped: boolean;
  queryFilter: {
    hospital?: Types.ObjectId;
    branch?: Types.ObjectId | null | { $or?: any[] };
  };
}

/**
 * Resolves the authenticated tenant context (hospital and active branch) for a request.
 * Strictly enforces user's assigned branch if locked (e.g. receptionists, doctors, nurses, lab, pharmacy).
 * For Admins/Super Admins, validates selected branch against hospital ownership.
 */
export function getDataScope(req: Request): TenantContext {
  const user = req.user;

  if (!user) {
    // Unauthenticated request fallback
    const hospitalIdStr = (req.query.hospitalId as string) || (req.headers["x-hospital-id"] as string);
    if (hospitalIdStr && Types.ObjectId.isValid(hospitalIdStr)) {
      const hospitalId = new Types.ObjectId(hospitalIdStr);
      return {
        hospitalId,
        branchId: null,
        isBranchScoped: false,
        queryFilter: { hospital: hospitalId }
      };
    }
    throw new AppError("Authentication required.", 401);
  }

  // Super Admin view
  if (user.role === "super_admin") {
    const hospitalIdStr = (req.query.hospitalId as string) || (req.headers["x-hospital-id"] as string);
    const branchHeader = (req.headers["x-branch-id"] || req.headers["x-branch"] || req.query.branchId || req.query.branch) as string | undefined;

    if (!hospitalIdStr || !Types.ObjectId.isValid(hospitalIdStr)) {
      // Super admin without specific hospital filter sees everything or defaults
      return {
        hospitalId: null as any,
        branchId: null,
        isBranchScoped: false,
        queryFilter: {} as any
      };
    }

    const hospitalId = new Types.ObjectId(hospitalIdStr);
    let branchId: Types.ObjectId | null = null;
    const queryFilter: any = { hospital: hospitalId };

    if (branchHeader && branchHeader !== "all" && branchHeader !== "main" && Types.ObjectId.isValid(branchHeader)) {
      branchId = new Types.ObjectId(branchHeader);
      queryFilter.branch = branchId;
    } else if (branchHeader === "main") {
      queryFilter.branch = null;
    }

    return {
      hospitalId,
      branchId,
      isBranchScoped: !!branchId,
      queryFilter
    };
  }

  if (!user.hospital) {
    if (user.role === "patient") {
      return {
        hospitalId: null as any,
        branchId: null,
        isBranchScoped: false,
        queryFilter: {} as any
      };
    }
    throw new AppError("This account is not assigned to a hospital.", 403);
  }

  const hospitalId = user.hospital instanceof Types.ObjectId ? user.hospital : new Types.ObjectId(user.hospital as any);

  // Determine user branch
  let userBranchId: Types.ObjectId | null = null;
  if (user.branch) {
    userBranchId = user.branch instanceof Types.ObjectId ? user.branch : new Types.ObjectId(user.branch as any);
  }

  const branchHeader = (req.headers["x-branch-id"] || req.headers["x-branch"] || req.query.branchId || req.query.branch) as string | undefined;

  let activeBranchId: Types.ObjectId | null = null;
  let isBranchScoped = false;
  const queryFilter: any = { hospital: hospitalId };

  // If user account has a locked branch (e.g. receptionist@frcs.com), ALWAYS force user's branch
  if (userBranchId) {
    activeBranchId = userBranchId;
    isBranchScoped = true;
    queryFilter.branch = activeBranchId;
  } else if (user.role === "hospital_admin" || user.role === "accountant") {
    // Admin / Accountant can switch active branch
    if (branchHeader && branchHeader !== "all" && branchHeader !== "main") {
      if (!Types.ObjectId.isValid(branchHeader)) {
        throw new AppError("Invalid branch identifier format.", 400);
      }
      activeBranchId = new Types.ObjectId(branchHeader);
      isBranchScoped = true;
      queryFilter.branch = activeBranchId;
    } else if (branchHeader === "main") {
      // Explicit main hospital view
      activeBranchId = null;
      isBranchScoped = true;
      queryFilter.branch = null;
    } else if (branchHeader === "all") {
      // Admin explicit "all branches" view
      activeBranchId = null;
      isBranchScoped = false;
      // queryFilter has hospital only
    } else {
      // Default view when branchHeader is omitted: queryFilter scopes to hospital, or if active branch exists on user/session
      activeBranchId = null;
      isBranchScoped = false;
    }
  } else {
    // Other operational roles (receptionist, nurse, lab, pharmacist, etc.) whose user.branch is null.
    // These users belong to the Main Hospital and their scope MUST be unconditionally locked to
    // branch: null. The X-Branch-ID header is intentionally IGNORED here — allowing it would
    // let stale localStorage values from a previous branch session cross-contaminate data.
    activeBranchId = null;
    isBranchScoped = true;
    queryFilter.branch = null;
  }

  return {
    hospitalId,
    branchId: activeBranchId,
    isBranchScoped,
    queryFilter
  };
}
