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

  const filter: Record<string, any> = { ...req.hospitalFilter };
  if (status) filter.status = status;
  if (search) filter.name = new RegExp(search, "i");

  // Enforce doctor data isolation for patient lists
  if (req.user!.role === "doctor") {
    const doctor = await getLoggedDoctor(req);
    const [apptPatients, admissionPatients, labPatients, radioPatients, assignedPatients] = await Promise.all([
      Appointment.distinct("patient", { hospital: filter.hospital, doctor: doctor._id }),
      Admission.distinct("patient", { hospital: filter.hospital, admittingDoctor: doctor._id }),
      LabOrder.distinct("patient", { hospital: filter.hospital, doctor: doctor._id }),
      RadiologyOrder.distinct("patient", { hospital: filter.hospital, doctor: doctor._id }),
      Patient.distinct("_id", { hospital: filter.hospital, assignedDoctor: doctor._id }),
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
  const patient = await Patient.create({ ...body, hospital: req.hospitalFilter!.hospital });
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
  const patient = await Patient.findOne({ _id: req.params.id, ...req.hospitalFilter }).populate("assignedDoctor", "name");
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
  res.status(201).json({ status: "success", data: { patient } });
});
