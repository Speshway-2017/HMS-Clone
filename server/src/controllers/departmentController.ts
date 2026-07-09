import { Request, Response } from "express";
import { z } from "zod";
import { Department, DEPARTMENT_STATUSES } from "../models/Department";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

const departmentSchema = z.object({
  hospital: z.string().min(1),
  branch: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  category: z.string().optional().default("general"),
  headName: z.string().optional().default(""),
  totalBeds: z.coerce.number().min(0).optional().default(0),
  doctors: z.coerce.number().min(0).optional().default(0),
  nurses: z.coerce.number().min(0).optional().default(0),
  support: z.coerce.number().min(0).optional().default(0),
  services: z.array(z.string()).optional().default([]),
  status: z.enum(DEPARTMENT_STATUSES).optional(),
});

export const listDepartments = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.query.hospitalId as string | undefined;
  const filter: Record<string, unknown> = {};
  if (hospitalId) {
    filter.hospital = hospitalId;
  }

  const departments = await Department.find(filter).populate("hospital", "name").sort({ createdAt: -1 });
  res.json({ status: "success", data: { departments } });
});

export const createDepartment = catchAsync(async (req: Request, res: Response) => {
  const body = departmentSchema.parse(req.body);
  const department = await Department.create(body);
  res.status(201).json({ status: "success", data: { department } });
});

export const getDepartment = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findById(req.params.id).populate("hospital", "name");
  if (!department) {
    throw new AppError("Department not found.", 404);
  }
  res.json({ status: "success", data: { department } });
});

export const updateDepartment = catchAsync(async (req: Request, res: Response) => {
  const body = departmentSchema.partial().parse(req.body);
  const department = await Department.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!department) {
    throw new AppError("Department not found.", 404);
  }
  res.json({ status: "success", data: { department } });
});

export const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findByIdAndDelete(req.params.id);
  if (!department) {
    throw new AppError("Department not found.", 404);
  }
  res.status(204).send();
});

export const getDepartmentMetrics = catchAsync(async (req: Request, res: Response) => {
  const department = await Department.findById(req.params.id).populate("hospital", "name");
  if (!department) {
    throw new AppError("Department not found.", 404);
  }

  res.json({
    status: "success",
    data: {
      department,
      bedOccupancy: { pending: true, message: "Bed occupancy tracking requires the Patient/Admissions module." },
      patientVolumeTrend: { pending: true, data: [] },
      staffPerformance: { pending: true, data: [] },
      patientScore: { pending: true },
    },
  });
});
