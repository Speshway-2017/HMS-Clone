import { Request, Response } from "express";
import { z } from "zod";
import { Patient, PATIENT_STATUSES } from "../models/Patient";
import { Doctor } from "../models/Doctor";
import { Types } from "mongoose";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";

const medicalHistoryEntrySchema = z.object({
  date: z.coerce.date(),
  visitType: z.string().optional().default(""),
  doctorName: z.string().optional().default(""),
  department: z.string().optional().default(""),
  diagnosis: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  status: z.string().optional().default("Completed"),
});

const patientSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  age: z.coerce.number().min(0).optional().nullable(),
  gender: z.string().optional().default(""),
  bloodGroup: z.string().optional().default(""),
  address: z.string().optional().default(""),
  assignedDoctor: z.string().optional().nullable(),
  status: z.enum(PATIENT_STATUSES).optional(),
  allergies: z.string().optional().default(""),
  insuranceProvider: z.string().optional().default(""),
  insurancePolicyNumber: z.string().optional().default(""),
});

export const listPatients = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req, 20);
  const { status, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { ...req.hospitalFilter };
  if (status) filter.status = status;
  if (search) filter.name = new RegExp(search, "i");

  if (req.user?.role === "doctor") {
    const doctor = await Doctor.findOne({ email: req.user.email, isActive: { $ne: false } });
    if (doctor) {
      filter.assignedDoctor = doctor._id;
    } else {
      filter.assignedDoctor = new Types.ObjectId();
    }
  }

  const [patients, total, statusCounts, admissionsToday] = await Promise.all([
    Patient.find(filter).populate("assignedDoctor", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Patient.countDocuments(filter),
    Patient.aggregate([
      { 
        $match: { 
          ...req.hospitalFilter as Record<string, unknown>,
          ...(req.user?.role === "doctor" && filter.assignedDoctor ? { assignedDoctor: filter.assignedDoctor } : {})
        } 
      }, 
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    Patient.countDocuments({ 
      ...req.hospitalFilter, 
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      ...(req.user?.role === "doctor" && filter.assignedDoctor ? { assignedDoctor: filter.assignedDoctor } : {})
    }),
  ]);

  res.json({
    status: "success",
    ...paginatedResponse(patients, total, { page, limit, skip }),
    counts: {
      total,
      admitted: statusCounts.find((s) => s._id === "admitted")?.count ?? 0,
      opd: statusCounts.find((s) => s._id === "opd")?.count ?? 0,
      discharged: statusCounts.find((s) => s._id === "discharged")?.count ?? 0,
      newToday: admissionsToday,
    },
  });
});

export const createPatient = catchAsync(async (req: Request, res: Response) => {
  const body = patientSchema.parse(req.body);
  const patient = await Patient.create({ ...body, hospital: req.hospitalFilter!.hospital });
  res.status(201).json({ status: "success", data: { patient } });
});

export const getPatient = catchAsync(async (req: Request, res: Response) => {
  const patient = await Patient.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("assignedDoctor", "name");
  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }
  res.json({ status: "success", data: { patient } });
});

export const updatePatient = catchAsync(async (req: Request, res: Response) => {
  const body = patientSchema.partial().parse(req.body);
  const patient = await Patient.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }
  res.json({ status: "success", data: { patient } });
});

export const deletePatient = catchAsync(async (req: Request, res: Response) => {
  const patient = await Patient.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }
  res.status(204).send();
});

export const addMedicalHistoryEntry = catchAsync(async (req: Request, res: Response) => {
  const entry = medicalHistoryEntrySchema.parse(req.body);
  const patient = await Patient.findOneAndUpdate(
    { _id: req.params.id, ...req.hospitalFilter },
    { $push: { medicalHistory: { $each: [entry], $position: 0 } } },
    { new: true, runValidators: true },
  );
  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }
  res.status(201).json({ status: "success", data: { patient } });
});
