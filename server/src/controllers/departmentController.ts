import { Request, Response } from "express";
import { z } from "zod";
import { Department, DEPARTMENT_STATUSES } from "../models/Department";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

const departmentSchema = z.object({
  hospital: z.string().optional(),
  branch: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  category: z.string().optional().default("general"),
  headName: z.string().optional().default(""),
  location: z.string().optional().default(""),
  totalBeds: z.coerce.number().min(0).optional().default(0),
  occupiedBeds: z.coerce.number().min(0).optional().default(0),
  doctors: z.coerce.number().min(0).optional().default(0),
  nurses: z.coerce.number().min(0).optional().default(0),
  support: z.coerce.number().min(0).optional().default(0),
  services: z.array(z.string()).optional().default([]),
  rating: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(DEPARTMENT_STATUSES).optional(),
});

export const listDepartments = catchAsync(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { ...req.hospitalFilter };

  const departments = await Department.find(filter).populate("hospital", "name").sort({ createdAt: -1 });
  res.json({ status: "success", data: { departments } });
});

export const createDepartment = catchAsync(async (req: Request, res: Response) => {
  const body = departmentSchema.parse(req.body);
  const hospital = body.hospital ?? (req.hospitalFilter?.hospital as string | undefined);
  if (!hospital) {
    throw new AppError("A hospital must be specified.", 400);
  }
  const department = await Department.create({ ...body, hospital });
  res.status(201).json({ status: "success", data: { department } });
});

export const getDepartment = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("hospital", "name");
  if (!department) {
    throw new AppError("Department not found.", 404);
  }
  res.json({ status: "success", data: { department } });
});

export const updateDepartment = catchAsync(async (req: Request, res: Response) => {
  const body = departmentSchema.partial().parse(req.body);
  const department = await Department.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!department) {
    throw new AppError("Department not found.", 404);
  }
  res.json({ status: "success", data: { department } });
});

export const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!department) {
    throw new AppError("Department not found.", 404);
  }
  res.status(204).send();
});

export const getDepartmentMetrics = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("hospital", "name");
  if (!department) {
    throw new AppError("Department not found.", 404);
  }

  const bedOccupancyPercent = department.totalBeds > 0 ? Math.round((department.occupiedBeds / department.totalBeds) * 100) : 0;

  res.json({
    status: "success",
    data: {
      department,
      bedOccupancy: { percent: bedOccupancyPercent, occupied: department.occupiedBeds, total: department.totalBeds },
      patientVolumeTrend: { pending: true, data: [] },
      staffPerformance: { pending: true, data: [] },
    },
  });
});
