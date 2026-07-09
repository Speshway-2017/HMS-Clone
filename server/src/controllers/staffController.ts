import { Request, Response } from "express";
import { z } from "zod";
import { Staff, STAFF_DUTY_STATUSES } from "../models/Staff";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";

const staffSchema = z.object({
  department: z.string().optional().nullable(),
  name: z.string().min(1),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  role: z.string().optional().default(""),
  employeeId: z.string().optional().default(""),
  qualifications: z.string().optional().default(""),
  dateOfJoining: z.coerce.date().optional().nullable(),
  dutyStatus: z.enum(STAFF_DUTY_STATUSES).optional(),
  checkInTime: z.string().optional().default(""),
  taskLoad: z.coerce.number().min(0).max(100).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
});

export const listStaff = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req, 20);
  const { role, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { ...req.hospitalFilter };
  if (role) filter.role = role;
  if (search) filter.name = new RegExp(search, "i");

  const [staff, total, dutyCounts] = await Promise.all([
    Staff.find(filter).populate("department", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Staff.countDocuments(filter),
    Staff.aggregate([{ $match: req.hospitalFilter as Record<string, unknown> }, { $group: { _id: "$dutyStatus", count: { $sum: 1 } } }]),
  ]);

  const countByStatus = (key: string) => dutyCounts.find((c) => c._id === key)?.count ?? 0;

  res.json({
    status: "success",
    ...paginatedResponse(staff, total, { page, limit, skip }),
    counts: {
      present: countByStatus("on_duty"),
      late: countByStatus("late"),
      absent: countByStatus("off_duty"),
      onLeave: countByStatus("on_leave"),
    },
  });
});

export const getTopStaff = catchAsync(async (req: Request, res: Response) => {
  const staff = await Staff.find(req.hospitalFilter as Record<string, unknown>)
    .sort({ rating: -1 })
    .limit(3);
  res.json({ status: "success", data: { staff } });
});

export const createStaff = catchAsync(async (req: Request, res: Response) => {
  const body = staffSchema.parse(req.body);
  const staff = await Staff.create({ ...body, hospital: req.hospitalFilter!.hospital });
  res.status(201).json({ status: "success", data: { staff } });
});

export const getStaffMember = catchAsync(async (req: Request, res: Response) => {
  const staff = await Staff.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("department", "name");
  if (!staff) {
    throw new AppError("Staff member not found.", 404);
  }
  res.json({ status: "success", data: { staff } });
});

export const updateStaff = catchAsync(async (req: Request, res: Response) => {
  const body = staffSchema.partial().parse(req.body);
  const staff = await Staff.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!staff) {
    throw new AppError("Staff member not found.", 404);
  }
  res.json({ status: "success", data: { staff } });
});

export const deleteStaff = catchAsync(async (req: Request, res: Response) => {
  const staff = await Staff.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!staff) {
    throw new AppError("Staff member not found.", 404);
  }
  res.status(204).send();
});
