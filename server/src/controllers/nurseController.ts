import { Request, Response } from "express";
import { Types } from "mongoose";
import { Admission } from "../models/Admission";
import { Staff } from "../models/Staff";
import { Bed } from "../models/Bed";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

// 1. Get Nurse Inpatients
export const getNurseInpatients = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const inpatients = await Admission.find({
    hospital: hospitalId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  })
    .populate("patient", "name uhid age gender phone bloodGroup allergies insuranceProvider")
    .populate("room", "roomNumber category")
    .populate("bed", "bedNumber")
    .populate("admittingDoctor", "name specialization")
    .sort({ admissionDate: -1 });

  res.json({ status: "success", data: inpatients });
});

// 2. Get Nurse Inpatient Details
export const getNurseInpatientDetails = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const admission = await Admission.findOne({
    hospital: hospitalId,
    patient: req.params.id,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  })
    .populate("patient")
    .populate("room")
    .populate("bed")
    .populate("admittingDoctor", "name specialization");

  if (!admission) {
    throw new AppError("No active inpatient admission found.", 404);
  }
  res.json({ status: "success", data: admission });
});

// 3. Save Nurse Inpatient Vitals
export const saveNurseInpatientVitals = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const { temperature, bloodPressure, pulseRate, respiratoryRate, oxygenSaturation, weight } = req.body;
  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

  const newVital = {
    temperature: temperature || "",
    bloodPressure: bloodPressure || "",
    pulseRate: pulseRate || "",
    respiratoryRate: respiratoryRate || "",
    oxygenSaturation: oxygenSaturation || "",
    weight: weight || "",
    recordedAt: new Date(),
    recordedBy: recordedByName
  };

  activeAdmission.vitals.push(newVital);

  // Add timeline entry
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: recordedByName,
    userRole: "nurse",
    eventType: "vital_update",
    description: `Vitals recorded: Temp ${temperature || "—"}°F, BP ${bloodPressure || "—"}, Pulse ${pulseRate || "—"} bpm`
  });

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});

// 4. Add Nurse Inpatient Progress Notes / Care Logs
export const addNurseInpatientNotes = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const patientId = req.params.id;
  const { notes } = req.body;
  const staff = await Staff.findOne({ email: req.user!.email });
  const recordedByName = staff?.name || req.user!.name || "Nurse";

  const activeAdmission = await Admission.findOne({
    hospital: hospitalId,
    patient: patientId,
    status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
  });

  if (!activeAdmission) {
    throw new AppError("No active inpatient admission found.", 404);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

  // Add to progress notes log or timeline
  activeAdmission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: recordedByName,
    userRole: "nurse",
    eventType: "clinical_note",
    description: notes || ""
  });

  await activeAdmission.save();
  res.json({ status: "success", data: activeAdmission });
});
