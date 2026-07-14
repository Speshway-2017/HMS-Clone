import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Doctor, DOCTOR_STATUSES } from "../models/Doctor";
import { User } from "../models/User";
import { Appointment } from "../models/Appointment";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { generateTempPassword } from "../utils/idGenerator";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { getDoctorDynamicStatus, getBusyDoctorIds } from "../utils/doctorStatus";

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

  const busyDoctorIds = await getBusyDoctorIds(req.hospitalFilter!.hospital as any);

  const [doctors, allHospitalDoctors] = await Promise.all([
    Doctor.find(filter).populate("department", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Doctor.find(req.hospitalFilter as Record<string, unknown>),
  ]);

  const resolvedPaginated = doctors.map(d => {
    return { ...d.toObject(), status: getDoctorDynamicStatus(d, busyDoctorIds) };
  });

  const allResolvedDoctors = allHospitalDoctors.map(d => {
    return { ...d.toObject(), status: getDoctorDynamicStatus(d, busyDoctorIds) };
  });

  const totalFiltered = await Doctor.countDocuments(filter);
  const total = allResolvedDoctors.length;
  const onDutyCount = allResolvedDoctors.filter(d => d.status === "on_duty").length;
  const onLeaveCount = allResolvedDoctors.filter(d => d.status === "on_leave").length;

  res.json({
    status: "success",
    ...paginatedResponse(resolvedPaginated, totalFiltered, { page, limit, skip }),
    counts: {
      total,
      onDuty: onDutyCount,
      onLeave: onLeaveCount,
    },
  });
});

export const createDoctor = catchAsync(async (req: Request, res: Response) => {
  const body = doctorSchema.parse(req.body);
  const hospitalId = req.hospitalFilter!.hospital;

  // Create the Doctor profile record
  const doctor = await Doctor.create({ ...body, hospital: hospitalId });

  // Auto-create a login User account if an email is provided
  let tempPassword: string | undefined;
  if (body.email) {
    tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await User.create({
      name: body.name,
      email: body.email,
      passwordHash,
      role: "doctor",
      hospital: hospitalId,
    });
  }

  res.status(201).json({
    status: "success",
    data: { doctor, tempPassword: tempPassword ?? null },
  });
});

export const getDoctor = catchAsync(async (req: Request, res: Response) => {
  const doctor = await Doctor.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("department", "name");
  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }

  const busyDoctorIds = await getBusyDoctorIds(req.hospitalFilter!.hospital as any);
  const resolvedDoctor = { ...doctor.toObject(), status: getDoctorDynamicStatus(doctor, busyDoctorIds) };

  const patientsTreated = await Appointment.countDocuments({ doctor: doctor._id, status: "completed" });

  res.json({ status: "success", data: { doctor: resolvedDoctor, stats: { patientsTreated } } });
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
  const doctor = await Doctor.findOneAndUpdate(
    { _id: req.params.id, ...req.hospitalFilter },
    {
      isActive: false,
      deletedAt: new Date(),
      deletedBy: req.user!._id,
      status: "INACTIVE"
    },
    { new: true }
  );
  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }

  // Deactivate associated login account if exists
  if (doctor.email) {
    await User.findOneAndUpdate({ email: doctor.email.toLowerCase() }, { status: "inactive" });
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

export const getDoctorProfileMe = catchAsync(async (req: Request, res: Response) => {
  const doctor = await Doctor.findOne({ email: req.user!.email }).populate("department", "name");
  if (!doctor) {
    throw new AppError("Doctor profile not found for the logged-in user.", 404);
  }
  const busyDoctorIds = await getBusyDoctorIds(doctor.hospital);
  const resolvedDoctor = { ...doctor.toObject(), status: getDoctorDynamicStatus(doctor, busyDoctorIds) };
  res.json({ status: "success", data: { doctor: resolvedDoctor } });
});

const updateDoctorMeSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  licenseNo: z.string().optional(),
  bio: z.string().optional(),
  languages: z.string().optional(),
  consultationFee: z.string().optional(),
  workingHours: z.array(z.object({
    day: z.string(),
    from: z.string(),
    to: z.string(),
    active: z.boolean()
  })).optional(),
  consultationSettings: z.object({
    slotDuration: z.number(),
    maxPatients: z.number(),
    breakTime: z.string()
  }).optional(),
});

export const updateDoctorProfileMe = catchAsync(async (req: Request, res: Response) => {
  const body = updateDoctorMeSchema.parse(req.body);
  
  const doctor = await Doctor.findOneAndUpdate(
    { email: req.user!.email },
    body,
    { new: true, runValidators: true }
  );
  
  if (!doctor) {
    throw new AppError("Doctor profile not found for the logged-in user.", 404);
  }

  // Sync user's name if name is updated in profile
  if (body.name) {
    await User.findOneAndUpdate({ email: req.user!.email }, { name: body.name });
  }

  const busyDoctorIds = await getBusyDoctorIds(doctor.hospital);
  const resolvedDoctor = { ...doctor.toObject(), status: getDoctorDynamicStatus(doctor, busyDoctorIds) };

  res.json({ status: "success", data: { doctor: resolvedDoctor } });
});

