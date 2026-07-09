import { Request, Response } from "express";
import { z } from "zod";
import { Doctor, DOCTOR_STATUSES } from "../models/Doctor";
import { Appointment } from "../models/Appointment";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";

const doctorSchema = z.object({
  department: z.string().optional().nullable(),
  name: z.string().min(1),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  specialization: z.string().optional().default(""),
  qualification: z.string().optional().default(""),
  licenseNo: z.string().optional().default(""),
  bio: z.string().optional().default(""),
  status: z.enum(DOCTOR_STATUSES).optional(),
  rating: z.coerce.number().min(0).max(100).optional(),
});

export const listDoctors = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req, 20);
  const { department, status, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { ...req.hospitalFilter };
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (search) filter.name = new RegExp(search, "i");

  const [doctors, total, statusCounts] = await Promise.all([
    Doctor.find(filter).populate("department", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Doctor.countDocuments(filter),
    Doctor.aggregate([{ $match: req.hospitalFilter as Record<string, unknown> }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  res.json({
    status: "success",
    ...paginatedResponse(doctors, total, { page, limit, skip }),
    counts: {
      total,
      onDuty: statusCounts.find((s) => s._id === "on_duty")?.count ?? 0,
      onLeave: statusCounts.find((s) => s._id === "on_leave")?.count ?? 0,
    },
  });
});

export const createDoctor = catchAsync(async (req: Request, res: Response) => {
  const body = doctorSchema.parse(req.body);
  const doctor = await Doctor.create({ ...body, hospital: req.hospitalFilter!.hospital });
  res.status(201).json({ status: "success", data: { doctor } });
});

export const getDoctor = catchAsync(async (req: Request, res: Response) => {
  const doctor = await Doctor.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("department", "name");
  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }

  const patientsTreated = await Appointment.countDocuments({ doctor: doctor._id, status: "completed" });

  res.json({ status: "success", data: { doctor, stats: { patientsTreated } } });
});

export const updateDoctor = catchAsync(async (req: Request, res: Response) => {
  const body = doctorSchema.partial().parse(req.body);
  const doctor = await Doctor.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }
  res.json({ status: "success", data: { doctor } });
});

export const deleteDoctor = catchAsync(async (req: Request, res: Response) => {
  const doctor = await Doctor.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }
  res.status(204).send();
});

export const getDoctorPerformance = catchAsync(async (req: Request, res: Response) => {
  const doctor = await Doctor.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("department", "name");
  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }

  const [monthlyVolume, completedTotal] = await Promise.all([
    Appointment.countDocuments({
      doctor: doctor._id,
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    }),
    Appointment.countDocuments({ doctor: doctor._id, status: "completed" }),
  ]);

  res.json({
    status: "success",
    data: {
      doctor,
      metrics: { monthlyVolume, completedTotal, patientSatisfaction: doctor.rating },
    },
  });
});
