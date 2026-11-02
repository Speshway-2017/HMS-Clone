import { Request, Response } from "express";
import { z } from "zod";
import { Branch, BRANCH_STATUSES } from "../models/Branch";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { generateBranchId } from "../utils/idGenerator";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { getRealtimeStaffCountsForBranches } from "../utils/branchStaffHelper";
import { syncBranchDepartmentsForBranch } from "../utils/branchDepartmentSync";
import { emitToHospital } from "../config/socket";
import {
  requiredTrimmedString,
  optionalTrimmedString,
  emailValidator,
  phoneValidator,
  numberValidator,
} from "../utils/validators";

const branchSchema = z.object({
  hospital: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional().default("General Hospital"),
  street: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  zip: z.string().optional().default(""),
  headName: z.string().optional().default(""),
  totalStaff: z.coerce.number().min(0).optional().default(0),
  status: z.enum(BRANCH_STATUSES).optional(),
});

export const listBranches = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  let hospitalId = req.query.hospitalId as string | undefined;

  if (req.user?.role !== "super_admin" && req.user?.hospital) {
    const rawHosp: any = req.user.hospital;
    hospitalId = typeof rawHosp === "object" && rawHosp ? rawHosp._id?.toString() : String(rawHosp);
  }

  const filter: Record<string, unknown> = {};
  if (hospitalId) {
    filter.hospital = hospitalId;
  }

  const [rawBranches, total, allMatchingBranches] = await Promise.all([
    Branch.find(filter).populate("hospital", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Branch.countDocuments(filter),
    Branch.find(filter).select("_id"),
  ]);

  const allMatchingIds = allMatchingBranches.map((b) => b._id);
  const countMap = await getRealtimeStaffCountsForBranches(allMatchingIds);

  const branches = rawBranches.map((b) => {
    const obj = b.toObject();
    const realtimeCount = countMap.get(b._id.toString()) ?? 0;
    obj.totalStaff = realtimeCount;
    return obj;
  });

  let grandTotalStaff = 0;
  for (const cnt of countMap.values()) {
    grandTotalStaff += cnt;
  }

  res.json({
    status: "success",
    ...paginatedResponse(branches, total, { page, limit, skip }),
    summary: { totalBranches: total, totalStaff: grandTotalStaff },
  });
});

export const createBranch = catchAsync(async (req: Request, res: Response) => {
  const body = branchSchema.parse(req.body);
  const branch = await Branch.create({ ...body, branchId: generateBranchId() });

  // Automatically inherit active departments from Parent Hospital
  await syncBranchDepartmentsForBranch(branch._id, branch.hospital);

  emitToHospital(branch.hospital, "branch:created", branch);

  res.status(201).json({ status: "success", data: { branch } });
});

export const getBranch = catchAsync(async (req: Request, res: Response) => {
  const branch = await Branch.findById(req.params.id).populate("hospital", "name");
  if (!branch) {
    throw new AppError("Branch not found.", 404);
  }
  if (req.user?.role !== "super_admin" && req.user?.hospital) {
    const userHospId = typeof req.user.hospital === "object" ? (req.user.hospital as any)._id?.toString() : String(req.user.hospital);
    const branchHospId = typeof branch.hospital === "object" ? (branch.hospital as any)._id?.toString() : String(branch.hospital);
    if (userHospId !== branchHospId) {
      throw new AppError("You do not have permission to view this branch.", 403);
    }
  }

  const countMap = await getRealtimeStaffCountsForBranches([branch._id]);
  const realtimeCount = countMap.get(branch._id.toString()) ?? 0;

  const branchObj = branch.toObject();
  branchObj.totalStaff = realtimeCount;

  res.json({ status: "success", data: { branch: branchObj } });
});

export const updateBranch = catchAsync(async (req: Request, res: Response) => {
  const body = branchSchema.partial().parse(req.body);
  const branch = await Branch.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!branch) {
    throw new AppError("Branch not found.", 404);
  }
  emitToHospital(branch.hospital, "branch:updated", branch);
  res.json({ status: "success", data: { branch } });
});

export const deleteBranch = catchAsync(async (req: Request, res: Response) => {
  const branch = await Branch.findByIdAndDelete(req.params.id);
  if (!branch) {
    throw new AppError("Branch not found.", 404);
  }
  emitToHospital(branch.hospital, "branch:deleted", { id: branch._id });
  res.status(204).send();
});
