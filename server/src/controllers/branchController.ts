import { Request, Response } from "express";
import { z } from "zod";
import { Branch, BRANCH_STATUSES } from "../models/Branch";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { generateBranchId } from "../utils/idGenerator";
import { getPagination, paginatedResponse } from "../utils/pagination";

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

  if (!hospitalId && req.user?.hospital && req.user?.role !== "super_admin") {
    const rawHosp: any = req.user.hospital;
    hospitalId = typeof rawHosp === "object" && rawHosp ? rawHosp._id?.toString() : String(rawHosp);
  }

  const filter: Record<string, unknown> = {};
  if (hospitalId) {
    filter.hospital = hospitalId;
  }

  const [branches, total, summary] = await Promise.all([
    Branch.find(filter).populate("hospital", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Branch.countDocuments(filter),
    Branch.aggregate([{ $match: filter }, { $group: { _id: null, totalStaff: { $sum: "$totalStaff" } } }]),
  ]);

  res.json({
    status: "success",
    ...paginatedResponse(branches, total, { page, limit, skip }),
    summary: { totalBranches: total, totalStaff: summary[0]?.totalStaff ?? 0 },
  });
});

export const createBranch = catchAsync(async (req: Request, res: Response) => {
  const body = branchSchema.parse(req.body);
  const branch = await Branch.create({ ...body, branchId: generateBranchId() });
  res.status(201).json({ status: "success", data: { branch } });
});

export const getBranch = catchAsync(async (req: Request, res: Response) => {
  const branch = await Branch.findById(req.params.id).populate("hospital", "name");
  if (!branch) {
    throw new AppError("Branch not found.", 404);
  }
  res.json({ status: "success", data: { branch } });
});

export const updateBranch = catchAsync(async (req: Request, res: Response) => {
  const body = branchSchema.partial().parse(req.body);
  const branch = await Branch.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!branch) {
    throw new AppError("Branch not found.", 404);
  }
  res.json({ status: "success", data: { branch } });
});

export const deleteBranch = catchAsync(async (req: Request, res: Response) => {
  const branch = await Branch.findByIdAndDelete(req.params.id);
  if (!branch) {
    throw new AppError("Branch not found.", 404);
  }
  res.status(204).send();
});
