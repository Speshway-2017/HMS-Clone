import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Doctor, DOCTOR_STATUSES } from "../models/Doctor";
import { User } from "../models/User";
import { Appointment } from "../models/Appointment";
import { Prescription } from "../models/Prescription";
import { DiagnosticReport } from "../models/DiagnosticReport";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { generateTempPassword, generateUniqueEmployeeId } from "../utils/idGenerator";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { getDoctorDynamicStatus, getBusyDoctorIds } from "../utils/doctorStatus";
import { syncDoctorStaffRecords } from "./staffController";

import { Department } from "../models/Department";
import { Feedback } from "../models/Feedback";
import { emitToHospital } from "../config/socket";

const doctorSchema = z.object({
  department: z.string().optional().nullable(),
  name: z.string().min(1),
  gender: z.string().min(1, "Gender is required").default("Male"),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  specialization: z.string().optional().default(""),
  qualification: z.string().optional().default(""),
  licenseNo: z.string().optional().default(""),
  bio: z.string().optional().default(""),
  status: z.enum(DOCTOR_STATUSES).optional(),
  rating: z.coerce.number().min(0).max(100).optional(),
  opExpiryLimit: z.coerce.number().min(0).optional(),
});

export const listDoctors = catchAsync(async (req: Request, res: Response) => {
  await syncDoctorStaffRecords();

  const { page, limit, skip } = getPagination(req, 20);
  const { department, status, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {
    ...req.hospitalFilter,
    isActive: { $ne: false },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
  };
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (search) filter.name = new RegExp(search, "i");

  const hospitalId = req.hospitalFilter?.hospital;
  const busyDoctorIds = await getBusyDoctorIds(hospitalId);

  const [doctors, allHospitalDoctors] = await Promise.all([
    Doctor.find(filter).populate("department", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Doctor.find({ ...req.hospitalFilter, isActive: { $ne: false } }),
  ]);

  const resolvedPaginated = doctors.map(d => ({
    ...d.toObject(),
    status: getDoctorDynamicStatus(d, busyDoctorIds)
  }));

  const allResolvedDoctors = allHospitalDoctors.map(d => ({
    ...d.toObject(),
    status: getDoctorDynamicStatus(d, busyDoctorIds)
  }));

  const totalFiltered = await Doctor.countDocuments(filter);
  const total = allResolvedDoctors.length;
  const onDutyCount = allResolvedDoctors.filter(d => d.status === "on_duty").length;
  const onLeaveCount = allResolvedDoctors.filter(d => d.status === "on_leave").length;

  res.json({
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
  const branchId = req.hospitalFilter?.branch || (req.body as any).branch || null;

  if (body.department) {
    const dept = await Department.findOne({ _id: body.department, ...req.hospitalFilter });
    if (!dept) {
      throw new AppError("Selected department does not exist in this branch.", 400);
    }
    if (dept.isDisabled) {
      throw new AppError(`Department "${dept.name}" is disabled in this branch and cannot be assigned to doctors.`, 400);
    }
  }

  let licenseNo = body.licenseNo?.trim();
  if (!licenseNo) {
    licenseNo = await generateUniqueEmployeeId("doctor", hospitalId, branchId);
  }

  // Create the Doctor profile record
  const doctor = await Doctor.create({
    ...body,
    licenseNo,
    hospital: hospitalId,
    branch: branchId
  });

  // Auto-create a login User account if an email is provided
  let tempPassword: string | undefined;
  if (body.email) {
    tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const existingUser = await User.findOne({ email: body.email.toLowerCase() });
    if (!existingUser) {
      await User.create({
        name: body.name,
        email: body.email,
        passwordHash,
        role: "doctor",
        employeeId: licenseNo,
        hospital: hospitalId,
        branch: branchId,
      });
    } else {
      await User.findOneAndUpdate(
        { email: body.email.toLowerCase() },
        { employeeId: licenseNo, hospital: hospitalId, branch: branchId, role: "doctor" }
      );
    }
  }

  emitToHospital(hospitalId, "doctor:created", doctor);

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

  // Count total completed patients
  const patientsTreated = await Appointment.countDocuments({ doctor: doctor._id, status: "completed" });

  // Fetch all appointments for this doctor populated with patient details
  const appointments = await Appointment.find({ doctor: doctor._id })
    .populate("patient", "name uhid age gender phone email")
    .sort({ date: -1, time: -1 });

  const appointmentIds = appointments.map(app => app._id);

  // Retrieve prescriptions and diagnostic reports for these appointments
  const prescriptions = await Prescription.find({ appointment: { $in: appointmentIds } });
  const diagnosticReports = await DiagnosticReport.find({ appointment: { $in: appointmentIds } });

  // Group by unique patient
  const patientGroupsMap = new Map<string, {
    patient: any;
    history: Array<{
      appointment: any;
      prescription: any;
      reports: any[];
    }>;
  }>();

  for (const app of appointments) {
    if (!app.patient) continue;
    const patientId = (app.patient as any)._id.toString();

    if (!patientGroupsMap.has(patientId)) {
      patientGroupsMap.set(patientId, {
        patient: app.patient,
        history: []
      });
    }

    const appPrescription = prescriptions.find(p => p.appointment?.toString() === app._id.toString());
    const appReports = diagnosticReports.filter(r => r.appointment?.toString() === app._id.toString());

    patientGroupsMap.get(patientId)!.history.push({
      appointment: app,
      prescription: appPrescription || null,
      reports: appReports
    });
  }

  const patientHistory = Array.from(patientGroupsMap.values());

  res.json({
    status: "success",
    data: {
      doctor: resolvedDoctor,
      stats: { patientsTreated },
      patients: patientHistory
    }
  });
});

export const updateDoctor = catchAsync(async (req: Request, res: Response) => {
  const body = doctorSchema.partial().parse(req.body);

  if (body.department) {
    const dept = await Department.findOne({ _id: body.department, ...req.hospitalFilter });
    if (!dept) {
      throw new AppError("Selected department does not exist in this branch.", 400);
    }
    if (dept.isDisabled) {
      throw new AppError(`Department "${dept.name}" is disabled in this branch and cannot be assigned to doctors.`, 400);
    }
  }

  const doctor = await Doctor.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }
  emitToHospital(doctor.hospital, "doctor:updated", doctor);
  res.json({ status: "success", data: { doctor } });
});

export const deleteDoctor = catchAsync(async (req: Request, res: Response) => {
  let doctor = await Doctor.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!doctor) {
    doctor = await Doctor.findByIdAndDelete(req.params.id);
  }
  
  if (!doctor) {
    // If doctor record was soft-deleted previously, try finding by ID and deleting
    const softDeletedDoc = await Doctor.findById(req.params.id);
    if (softDeletedDoc) {
      await Doctor.deleteOne({ _id: req.params.id });
      doctor = softDeletedDoc;
    }
  }

  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }

  // Delete associated login account if exists
  if (doctor.email) {
    await User.findOneAndDelete({ email: doctor.email.toLowerCase() });
  }

  emitToHospital(doctor.hospital, "doctor:deleted", { id: doctor._id });

  res.status(200).json({ status: "success", message: "Doctor deleted successfully." });
});

export const getDoctorPerformance = catchAsync(async (req: Request, res: Response) => {
  const doctor = await Doctor.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("department", "name");
  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }

  const hospitalId = doctor.hospital;

  // 1. Appointments counters
  const [completedTotal, upcomingTotal, totalBookings] = await Promise.all([
    Appointment.countDocuments({ hospital: hospitalId, doctor: doctor._id, status: "completed" }),
    Appointment.countDocuments({ hospital: hospitalId, doctor: doctor._id, status: { $in: ["scheduled", "checked_in", "waiting", "in_consultation"] } }),
    Appointment.countDocuments({ hospital: hospitalId, doctor: doctor._id, status: { $nin: ["cancelled", "no_show"] } })
  ]);

  // 2. Real patient feedback records
  const feedbackList = await Feedback.find({ hospital: hospitalId, doctor: doctor._id })
    .populate("patient", "name uhid photoUrl")
    .sort({ createdAt: -1 })
    .limit(20);

  // 3. Dynamic Rating Calculation
  const allRatings = await Feedback.find({ hospital: hospitalId, doctor: doctor._id }).select("rating");
  const totalReviews = allRatings.length;
  let avgRating = 0;
  const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (totalReviews > 0) {
    const sum = allRatings.reduce((acc, curr) => {
      const r = Math.min(5, Math.max(1, curr.rating));
      ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;
      return acc + r;
    }, 0);
    avgRating = parseFloat((sum / totalReviews).toFixed(1));
  }

  // 4. Monthly Consultations Trends (last 3 months)
  const now = new Date();
  const monthlyTrends: { month: string; consultations: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthName = d.toLocaleString("en-US", { month: "short" });

    const count = await Appointment.countDocuments({
      hospital: hospitalId,
      doctor: doctor._id,
      status: "completed",
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    monthlyTrends.push({ month: monthName, consultations: count });
  }

  res.json({
    status: "success",
    data: {
      doctor,
      metrics: {
        completedTotal,
        upcomingTotal,
        totalBookings,
        monthlyVolume: totalBookings,
        patientSatisfaction: avgRating ? Math.round(avgRating * 20) : (doctor.rating || 95),
        avgRating,
        totalReviews,
        ratingDistribution,
        monthlyTrends,
      },
      feedback: feedbackList.map(fb => ({
        _id: fb._id,
        patientName: (fb.patient as any)?.name || "Patient",
        patientUhid: (fb.patient as any)?.uhid || "",
        rating: fb.rating,
        comment: fb.comment,
        createdAt: fb.createdAt
      }))
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
  opExpiryLimit: z.coerce.number().min(0).optional(),
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
  monthlyAvailability: z.array(z.object({
    date: z.string(),
    from: z.string(),
    to: z.string(),
    active: z.boolean()
  })).optional(),
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

  emitToHospital(doctor.hospital, "doctor:updated", resolvedDoctor);

  res.json({ status: "success", data: { doctor: resolvedDoctor } });
});

