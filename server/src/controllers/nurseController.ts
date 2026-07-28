import { Request, Response } from "express";
import { Admission } from "../models/Admission";
import { Patient } from "../models/Patient";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { Types } from "mongoose";

// List all active admissions in the hospital
export const getNursesInpatients = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;

  const admissions = await Admission.find({
    hospital: hospitalId,
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
  .populate("patient", "name uhid age gender bloodGroup phone")
  .populate("room", "roomNumber")
  .populate("bed", "bedNumber")
  .populate("admittingDoctor", "name specialization")
  .sort({ admissionDate: -1 })
  .lean();

  res.json({
    status: "success",
    results: admissions.length,
    data: admissions
  });
});

// Get inpatient details by Admission ID
export const getInpatientDetailsForNurse = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const admissionId = req.params.id;

  const admission = await Admission.findOne({
    _id: admissionId,
    hospital: hospitalId
  })
  .populate("patient")
  .populate("room")
  .populate("bed")
  .populate("admittingDoctor", "name specialization phone");

  if (!admission) {
    throw new AppError("Active admission not found.", 404);
  }

  res.json({
    status: "success",
    data: admission
  });
});

// Save vitals for an active admission
export const saveVitalsForNurse = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const admissionId = req.params.id;
  const { temperature, bloodPressure, pulseRate, respiratoryRate, oxygenSaturation, weight } = req.body;

  const admission = await Admission.findOne({
    _id: admissionId,
    hospital: hospitalId,
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
  });

  if (!admission) {
    throw new AppError("Active admission not found.", 404);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
  const nurseName = req.user?.name || "Staff Nurse";

  const newVital = {
    temperature: temperature || "",
    bloodPressure: bloodPressure || "",
    pulseRate: pulseRate || "",
    respiratoryRate: respiratoryRate || "",
    oxygenSaturation: oxygenSaturation || "",
    weight: weight || "",
    recordedAt: new Date(),
    recordedBy: nurseName
  };

  admission.vitals.push(newVital);

  // Add timeline entry
  admission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: nurseName,
    userRole: "nurse",
    eventType: "vital_update",
    description: `Vitals recorded: Temp ${temperature || "—"}°F, BP ${bloodPressure || "—"}, Pulse ${pulseRate || "—"} bpm`
  });

  await admission.save();

  res.json({
    status: "success",
    data: admission
  });
});

// Administer Inpatient Medication
export const administerMedication = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const admissionId = req.params.id;
  const { medicationId } = req.params;

  const admission = await Admission.findOne({
    _id: admissionId,
    hospital: hospitalId
  });

  if (!admission) {
    throw new AppError("Active admission not found.", 404);
  }

  const med = admission.medicationOrders.find((m: any) => m._id.toString() === medicationId);
  if (!med) {
    throw new AppError("Medication order not found.", 404);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
  const nurseName = req.user?.name || "Staff Nurse";

  med.history.push({
    action: "administered",
    timestamp: new Date(),
    doctorName: nurseName,
    details: "Medication administered by nurse"
  });

  // Add timeline entry
  admission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: nurseName,
    userRole: "nurse",
    eventType: "medication_administered",
    description: `Medication administered: ${med.drugName} - Dosage: ${med.dosage}`
  });

  await admission.save();

  res.json({
    status: "success",
    data: admission
  });
});

// Log Inpatient Fluid Intake / Output
export const logFluid = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const admissionId = req.params.id;
  const { intakeVolume, intakeRoute, outputVolume, outputType } = req.body;

  const admission = await Admission.findOne({
    _id: admissionId,
    hospital: hospitalId
  });

  if (!admission) {
    throw new AppError("Active admission not found.", 404);
  }

  const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
  const nurseName = req.user?.name || "Staff Nurse";

  // Record fluid logs in timeline using a JSON payload or clear description
  const description = JSON.stringify({
    intakeVolume: intakeVolume || "0",
    intakeRoute: intakeRoute || "Oral",
    outputVolume: outputVolume || "0",
    outputType: outputType || "Urine"
  });

  admission.timeline.push({
    date: new Date(),
    time: currentTime,
    userName: nurseName,
    userRole: "nurse",
    eventType: "fluid_log",
    description: description
  });

  await admission.save();

  res.json({
    status: "success",
    data: admission
  });
});

// Get all active nurses in the hospital
export const getNurses = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const nurses = await User.find({
    hospital: hospitalId,
    role: "nurse",
    status: "active"
  }).select("name email employeeId avatarUrl");

  res.json({
    status: "success",
    data: nurses
  });
});
