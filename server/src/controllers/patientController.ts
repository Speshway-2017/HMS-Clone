import { Request, Response } from "express";
import { z } from "zod";
import { Patient, PATIENT_STATUSES } from "../models/Patient";
import { Doctor } from "../models/Doctor";
import mongoose, { Types } from "mongoose";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { Admission } from "../models/Admission";
import { Bed } from "../models/Bed";
import { Appointment } from "../models/Appointment";
import { LabOrder } from "../models/LabOrder";
import { RadiologyOrder } from "../models/RadiologyOrder";
import { emitToHospital } from "../config/socket";
import { logAudit } from "../utils/auditLogger";

async function getLoggedDoctor(req: Request) {
  const doctor = await Doctor.findOne({ email: req.user!.email, isActive: { $ne: false } });
  if (!doctor) {
    throw new AppError("Doctor profile not found for the logged-in user.", 404);
  }
  return doctor;
}

async function checkPatientDoctorAccess(req: Request, patientId: string) {
  if (req.user!.role === "doctor") {
    const doctor = await getLoggedDoctor(req);
    const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
    const patId = new Types.ObjectId(patientId);
    
    const [apptCount, admissionCount, labCount, radioCount, patientAssignedCount] = await Promise.all([
      Appointment.countDocuments({ hospital: hospitalId, doctor: doctor._id, patient: patId }),
      Admission.countDocuments({ hospital: hospitalId, admittingDoctor: doctor._id, patient: patId }),
      LabOrder.countDocuments({ hospital: hospitalId, doctor: doctor._id, patient: patId }),
      RadiologyOrder.countDocuments({ hospital: hospitalId, doctor: doctor._id, patient: patId }),
      Patient.countDocuments({ hospital: hospitalId, _id: patId, assignedDoctor: doctor._id }),
    ]);
    if (apptCount + admissionCount + labCount + radioCount + patientAssignedCount === 0) {
      throw new AppError("You do not have access to this patient's records.", 403);
    }
  }
}

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
  age: z.coerce.number().min(0, "Age must be at least 0").max(150, "Age cannot exceed 150 years").optional().nullable(),
  gender: z.string().optional().default(""),
  bloodGroup: z.string().optional().default(""),
  address: z.string().optional().default(""),
  assignedDoctor: z.string().optional().nullable(),
  status: z.enum(PATIENT_STATUSES).optional(),
  allergies: z.string().optional().default(""),
  insuranceProvider: z.string().optional().default(""),
  insurancePolicyNumber: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  emergencyContact: z.object({
    name: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    relation: z.string().optional().default("")
  }).optional(),
});

export const listPatients = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req, 20);
  const { status, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, any> = { ...req.hospitalFilter };
  if (status) filter.status = status;
  if (search) filter.name = new RegExp(search, "i");

  // Enforce doctor data isolation for patient lists
  if (req.user!.role === "doctor") {
    const doctor = await getLoggedDoctor(req);
    const [apptPatients, admissionPatients, labPatients, radioPatients, assignedPatients] = await Promise.all([
      Appointment.distinct("patient", { ...filter, doctor: doctor._id }),
      Admission.distinct("patient", { ...filter, admittingDoctor: doctor._id }),
      LabOrder.distinct("patient", { ...filter, doctor: doctor._id }),
      RadiologyOrder.distinct("patient", { ...filter, doctor: doctor._id }),
      Patient.distinct("_id", { ...filter, assignedDoctor: doctor._id }),
    ]);
    const patientIdSet = new Set<string>([
      ...apptPatients.map((id: any) => id.toString()),
      ...admissionPatients.map((id: any) => id.toString()),
      ...labPatients.map((id: any) => id.toString()),
      ...radioPatients.map((id: any) => id.toString()),
      ...assignedPatients.map((id: any) => id.toString()),
    ]);
    const patientIds = Array.from(patientIdSet).map((id) => new Types.ObjectId(id));
    filter._id = { $in: patientIds };
  }

  const [patients, total, statusCounts, admissionsToday] = await Promise.all([
    Patient.find(filter).populate("assignedDoctor", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Patient.countDocuments(filter),
    Patient.aggregate([
      { 
        $match: { 
          ...filter
        } 
      }, 
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    Patient.countDocuments({ 
      ...filter, 
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
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
  const hospitalId = req.hospitalFilter!.hospital;

  if (body.insurancePolicyNumber && body.insurancePolicyNumber.trim()) {
    const existingPolicy = await Patient.findOne({
      hospital: hospitalId,
      insurancePolicyNumber: body.insurancePolicyNumber.trim()
    });
    if (existingPolicy) {
      throw new AppError("Insurance Policy Number is already registered to another patient.", 400);
    }
  }

  const branchId = req.hospitalFilter?.branch || (req.body as any).branch || null;
  const patient = await Patient.create({ ...body, hospital: hospitalId, branch: branchId });

  if (req.hospitalFilter?.hospital) {
    emitToHospital(req.hospitalFilter.hospital, "patient_created", { patientId: patient._id, name: patient.name, uhid: patient.uhid });
  }

  await logAudit({
    req,
    action: "CREATE_PATIENT",
    entity: "Patient",
    entityId: patient._id.toString(),
    details: { name: patient.name, uhid: patient.uhid }
  });

  res.status(201).json({
    success: true,
    patientId: patient._id,
    patient,
    uhid: patient.uhid,
    status: "success",
    data: { patient }
  });
});

export const getPatient = catchAsync(async (req: Request, res: Response) => {
  await checkPatientDoctorAccess(req, req.params.id);
  const hospitalId = req.hospitalFilter?.hospital || req.user?.hospital;
  const patient = await Patient.findOne({ _id: req.params.id, hospital: hospitalId }).populate("assignedDoctor", "name");
  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }

  // Find active admission and populate room, bed, admitting doctor
  const activeAdmission = await Admission.findOne({
    hospital: req.hospitalFilter?.hospital,
    patient: patient._id,
    status: {
      $in: [
        "admitted",
        "Admitted",
        "Bed Allocated",
        "Under Observation",
        "Waiting for Bed",
        "In Ward",
        "ICU",
        "Operation Scheduled",
        "Under Treatment",
        "Transferred"
      ]
    }
  })
  .populate("room", "roomNumber")
  .populate("bed", "bedNumber")
  .populate("admittingDoctor", "name");

  res.json({
    status: "success",
    data: {
      patient,
      activeAdmission: activeAdmission ? {
        _id: activeAdmission._id,
        admissionNumber: activeAdmission.admissionNumber,
        status: activeAdmission.status,
        admissionDate: activeAdmission.admissionDate,
        ward: activeAdmission.ward,
        roomNumber: (activeAdmission.room as any)?.roomNumber || "N/A",
        bedNumber: (activeAdmission.bed as any)?.bedNumber || "N/A",
        admittingDoctor: (activeAdmission.admittingDoctor as any)?.name || "N/A"
      } : null
    }
  });
});

export const updatePatient = catchAsync(async (req: Request, res: Response) => {
  await checkPatientDoctorAccess(req, req.params.id);
  const body = patientSchema.partial().parse(req.body);
  const hospitalId = req.hospitalFilter!.hospital;

  if (body.insurancePolicyNumber && body.insurancePolicyNumber.trim()) {
    const existingPolicy = await Patient.findOne({
      hospital: hospitalId,
      insurancePolicyNumber: body.insurancePolicyNumber.trim(),
      _id: { $ne: req.params.id }
    });
    if (existingPolicy) {
      throw new AppError("Insurance Policy Number is already registered to another patient.", 400);
    }
  }

  const patient = await Patient.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }

  if (req.hospitalFilter?.hospital) {
    emitToHospital(req.hospitalFilter.hospital, "patient_updated", { patientId: patient._id });
  }

  await logAudit({
    req,
    action: "UPDATE_PATIENT",
    entity: "Patient",
    entityId: patient._id.toString(),
    details: body
  });

  res.json({ status: "success", data: { patient } });
});

export const deletePatient = catchAsync(async (req: Request, res: Response) => {
  const patientId = req.params.id;
  const hospitalId = req.hospitalFilter!.hospital;

  // Release any occupied beds before deleting the patient
  const activeAdmissions = await Admission.find({ hospital: hospitalId, patient: patientId, status: "admitted" });
  for (const adm of activeAdmissions) {
    await Bed.updateOne({ _id: adm.bed, hospital: hospitalId }, { isOccupied: false, status: "Available" });
  }

  // Delete admissions for this patient
  await Admission.deleteMany({ hospital: hospitalId, patient: patientId });

  const patient = await Patient.findOneAndDelete({ _id: patientId, ...req.hospitalFilter });
  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }

  if (hospitalId) {
    emitToHospital(hospitalId, "patient_deleted", { patientId });
  }

  await logAudit({
    req,
    action: "DELETE_PATIENT",
    entity: "Patient",
    entityId: patientId,
    details: { name: patient.name, uhid: patient.uhid }
  });

  res.status(204).send();
});

export const addMedicalHistoryEntry = catchAsync(async (req: Request, res: Response) => {
  await checkPatientDoctorAccess(req, req.params.id);
  const entry = medicalHistoryEntrySchema.parse(req.body);
  const patient = await Patient.findOneAndUpdate(
    { _id: req.params.id, ...req.hospitalFilter },
    { $push: { medicalHistory: { $each: [entry], $position: 0 } } },
    { new: true, runValidators: true },
  );
  if (!patient) {
    throw new AppError("Patient not found.", 404);
  }

  if (req.hospitalFilter?.hospital) {
    emitToHospital(req.hospitalFilter.hospital, "patient_updated", { patientId: patient._id });
  }

  await logAudit({
    req,
    action: "ADD_MEDICAL_HISTORY",
    entity: "Patient",
    entityId: patient._id.toString(),
    details: entry
  });

  res.status(201).json({ status: "success", data: { patient } });
});

export const getPatientProfileMe = catchAsync(async (req: Request, res: Response) => {
  const userEmail = (req.user!.email || "").trim();
  const userPhone = (req.user!.phone || "").replace(/\D/g, "").slice(-10);
  const userName = (req.user!.name || "").trim();
  const userId = req.user!._id;

  const conditions: any[] = [{ user: userId }];
  if (userEmail) {
    conditions.push({ email: { $regex: `^${userEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
  }
  if (userPhone && userPhone.length >= 7) {
    conditions.push({ phone: { $regex: `${userPhone}$` } });
  }
  if (userName) {
    conditions.push({ name: { $regex: `^${userName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
  }

  let patient = await Patient.findOne({ $or: conditions }).populate("assignedDoctor", "name");

  if (patient && !patient.user) {
    patient.user = userId as any;
    if (userEmail && !patient.email) patient.email = userEmail;
    if (userPhone && !patient.phone) patient.phone = req.user!.phone || userPhone;
    await patient.save();
  }

  if (!patient) {
    const generateDigits = (length: number): string => {
      let result = "";
      const characters = "0123456789";
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    };
    const uhid = `UHID-${generateDigits(10)}`;
    const patientCode = `PAT-${generateDigits(6)}`;
    const qrCode = `HMS|${uhid}|${userName}|${req.user!.phone || ""}`;

    patient = await Patient.create({
      user: userId,
      hospital: req.user!.hospital || undefined,
      uhid,
      patientCode,
      qrCode,
      name: userName || "Patient",
      email: userEmail,
      phone: req.user!.phone || "",
      status: "opd",
      isActive: true,
    });
  }

  res.json({ status: "success", data: { patient } });
});

export const updatePatientProfileMe = catchAsync(async (req: Request, res: Response) => {
  const userEmail = (req.user!.email || "").trim();
  const userPhone = (req.user!.phone || "").replace(/\D/g, "").slice(-10);
  const userName = (req.user!.name || "").trim();
  const userId = req.user!._id;

  const conditions: any[] = [{ user: userId }];
  if (userEmail) {
    conditions.push({ email: { $regex: `^${userEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
  }
  if (userPhone && userPhone.length >= 7) {
    conditions.push({ phone: { $regex: `${userPhone}$` } });
  }
  if (userName) {
    conditions.push({ name: { $regex: `^${userName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
  }

  let patientSelf = await Patient.findOne({ $or: conditions });
  if (!patientSelf) {
    throw new AppError("Patient profile not found for the logged-in user.", 404);
  }

  const body = patientSchema.partial().parse(req.body);
  delete (body as any).uhid;

  const patient = await Patient.findByIdAndUpdate(patientSelf._id, body, {
    new: true,
    runValidators: true,
  });

  if (patientSelf.hospital) {
    emitToHospital(patientSelf.hospital.toString(), "patient_updated", { patientId: patient!._id });
  }

  await logAudit({
    req,
    action: "UPDATE_PATIENT_PROFILE",
    entity: "Patient",
    entityId: patientSelf._id.toString(),
    details: body
  });

  res.json({ status: "success", data: { patient } });
});

