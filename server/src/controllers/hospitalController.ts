import { Request, Response } from "express";
import { z } from "zod";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";

const hospitalSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional().default(""),
  contactEmail: z.string().email().optional().or(z.literal("")).default(""),
  contactPhone: z.string().optional().default(""),
  bedCapacity: z.coerce.number().min(0).optional().default(0),
  primaryAdminId: z.string().optional(),
});

export const listHospitals = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string | undefined;

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [{ name: new RegExp(search, "i") }, { code: new RegExp(search, "i") }];
  }
  if (status && status !== "all") {
    filter.status = status;
  }

  const [hospitals, total, statusCounts] = await Promise.all([
    Hospital.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Hospital.countDocuments(filter),
    Hospital.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const hospitalIds = hospitals.map((h) => h._id);
  const admins = await User.find({ hospital: { $in: hospitalIds }, role: "hospital_admin" }).select("name hospital");
  const adminByHospital = new Map(admins.map((a) => [String(a.hospital), a.name]));

  const data = hospitals.map((h) => ({
    ...h.toObject(),
    primaryAdminName: adminByHospital.get(String(h._id)) ?? null,
  }));

  res.json({
    status: "success",
    ...paginatedResponse(data, total, { page, limit, skip }),
    counts: {
      total,
      active: statusCounts.find((s) => s._id === "active")?.count ?? 0,
      inactive: statusCounts.find((s) => s._id === "inactive")?.count ?? 0,
    },
  });
});

export const createHospital = catchAsync(async (req: Request, res: Response) => {
  const body = hospitalSchema.parse(req.body);
  const { primaryAdminId, ...hospitalFields } = body;

  const hospital = await Hospital.create({ ...hospitalFields, createdBy: req.user!._id });

  if (primaryAdminId) {
    await User.findOneAndUpdate({ _id: primaryAdminId, role: "hospital_admin", hospital: null }, { hospital: hospital._id });
  }

  res.status(201).json({ status: "success", data: { hospital } });
});

export const getHospital = catchAsync(async (req: Request, res: Response) => {
  const hospital = await Hospital.findById(req.params.id);
  if (!hospital) {
    throw new AppError("Hospital not found.", 404);
  }

  const [branchCount, admin] = await Promise.all([
    Branch.countDocuments({ hospital: hospital._id }),
    User.findOne({ hospital: hospital._id, role: "hospital_admin" }).select("name email"),
  ]);

  const branches = await Branch.find({ hospital: hospital._id }).limit(6);

  res.json({
    status: "success",
    data: {
      hospital,
      stats: { branchCount, primaryAdmin: admin ?? null },
      branches,
    },
  });
});

export const updateHospital = catchAsync(async (req: Request, res: Response) => {
  const body = hospitalSchema.partial().parse(req.body);
  const { primaryAdminId, ...hospitalFields } = body;

  const hospital = await Hospital.findByIdAndUpdate(req.params.id, hospitalFields, {
    new: true,
    runValidators: true,
  });
  if (!hospital) {
    throw new AppError("Hospital not found.", 404);
  }

  if (primaryAdminId) {
    await User.findOneAndUpdate({ _id: primaryAdminId, role: "hospital_admin" }, { hospital: hospital._id });
  }

  res.json({ status: "success", data: { hospital } });
});

export const deleteHospital = catchAsync(async (req: Request, res: Response) => {
  const hospital = await Hospital.findByIdAndDelete(req.params.id);
  if (!hospital) {
    throw new AppError("Hospital not found.", 404);
  }
  res.status(204).send();
});

export const listUnassignedHospitalAdmins = catchAsync(async (_req: Request, res: Response) => {
  const admins = await User.find({ role: "hospital_admin", hospital: null }).select("name email");
  res.json({ status: "success", data: { admins } });
});
