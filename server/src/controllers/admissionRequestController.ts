import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { AdmissionRequest } from "../models/AdmissionRequest";
import { Admission } from "../models/Admission";
import { Appointment } from "../models/Appointment";
import { OPVisit } from "../models/OPVisit";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { DbNotification } from "../models/DbNotification";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { emitToHospital } from "../config/socket";
import { buildBranchQuery } from "../utils/branchQueryHelper";

// Helper to resolve the logged-in doctor profile
async function getLoggedDoctor(req: Request) {
  let doctor = await Doctor.findOne({ user: req.user!._id, isActive: { $ne: false } });
  if (!doctor) {
    doctor = await Doctor.findOne({ email: req.user!.email, isActive: { $ne: false } });
  }
  if (!doctor) {
    throw new AppError("Doctor profile not found for the logged-in user.", 404);
  }
  return doctor;
}

export const createAdmissionRequest = catchAsync(async (req: Request, res: Response) => {
  if (!["doctor", "hospital_admin", "super_admin"].includes(req.user!.role)) {
    throw new AppError("Forbidden: You do not have permission to recommend admissions.", 403);
  }
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const {
    appointmentId,
    priority = "Routine",
    preferredWard = "",
    preferredBedType = "",
    expectedStay = "",
    primaryDiagnosis,
    clinicalNotes = "",
    specialInstructions = ""
  } = req.body;

  if (!primaryDiagnosis || !primaryDiagnosis.trim()) {
    throw new AppError("Diagnosis is mandatory for admission recommendation.", 400);
  }

  const doctor = await getLoggedDoctor(req);
  const doctorObjIds = [doctor._id, (doctor as any).user, req.user?._id].filter(Boolean);

  const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId, doctor: { $in: doctorObjIds } })
    .populate("patient")
    .populate("doctor")
    .populate("department");

  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }

  const patient = appointment.patient as any;
  const docProfile = appointment.doctor as any;
  const department = appointment.department as any;

  // Find if there is an active OPVisit consultation
  const opVisit = await OPVisit.findOne({ patient: patient._id, doctor: { $in: doctorObjIds }, hospital: hospitalId }).sort({ createdAt: -1 });

  // 1. Validation: If patient already admitted
  const activeAdm = await Admission.findOne({
    hospital: hospitalId,
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
  });
  if (activeAdm) {
    throw new AppError("Patient already admitted.", 400);
  }

  // 2. Validation: If pending request already exists
  const existingPending = await AdmissionRequest.findOne({
    hospital: hospitalId,
    patient: patient._id,
    status: { $in: ["Pending", "pending", "Admission Requested", "AdmissionRequested"] }
  });
  if (existingPending) {
    return res.json({ status: "success", data: existingPending, message: "Admission request already pending." });
  }

  // 3. Validation: If OP already converted to IP
  if (opVisit && opVisit.status === "ConvertedToIP") {
    throw new AppError("OP already converted to IP.", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 4. Generate unique Admission Request Number: ARYYYY000001
    const currentYear = new Date().getFullYear();
    const prefix = `AR${currentYear}`;
    const latestReq = await AdmissionRequest.findOne({
      hospital: hospitalId,
      requestNumber: new RegExp(`^${prefix}`)
    }).sort({ createdAt: -1 }).session(session);

    let nextSerial = 1;
    if (latestReq) {
      const serialPart = latestReq.requestNumber.replace(prefix, "");
      const lastSerial = parseInt(serialPart, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
    const requestNumber = `${prefix}${String(nextSerial).padStart(6, "0")}`;

    // Create request
    const branchId = doctor.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null;
    const [admissionReq] = await AdmissionRequest.create([{
      hospital: hospitalId,
      branch: branchId,
      requestNumber,
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      consultation: opVisit ? opVisit._id : null,
      department: department ? department._id : null,
      priority,
      preferredWard,
      preferredBedType,
      expectedStay,
      diagnosis: primaryDiagnosis,
      primaryDiagnosis,
      notes: clinicalNotes,
      clinicalNotes,
      specialInstructions,
      requestedAt: new Date(),
      requestedBy: doctor._id,
      status: "Pending"
    }], { session });

    // Create DB notification for receptionist fallback
    await DbNotification.create([{
      hospital: hospitalId,
      branch: branchId,
      title: "New Admission Request",
      message: `Dr. ${docProfile?.name || doctor.name} requested IP admission for ${patient.name} (${patient.uhid}) due to: ${primaryDiagnosis}`,
      type: "admission_request",
      recipientRole: "receptionist",
      severity: priority === "Emergency" ? "critical" : "warning",
      link: `/receptionist/ip`,
      data: {
        patientId: patient._id.toString(),
        opVisitId: appointment._id.toString(),
        diagnosis: primaryDiagnosis,
        suggestedWard: preferredWard || "General",
        notes: clinicalNotes,
        requestId: admissionReq._id.toString(),
        requestNumber
      }
    }], { session });

    await session.commitTransaction();

    emitToHospital(hospitalId.toString(), "admission_request_created", admissionReq);
    emitToHospital(hospitalId.toString(), "dashboard_update", { action: "admission_request" });

    res.status(201).json({ status: "success", data: admissionReq });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

export const getAdmissionRequests = catchAsync(async (req: Request, res: Response) => {
  const statusParam = req.query.status as string;

  const filter: any = buildBranchQuery(req.hospitalFilter);
  if (!statusParam || ["Pending", "pending", "Admission Requested"].includes(statusParam)) {
    filter.status = { $in: ["Pending", "pending", "Admission Requested", "AdmissionRequested"] };
  } else {
    filter.status = statusParam;
  }

  if (req.user!.role === "doctor") {
    const doctor = await getLoggedDoctor(req);
    delete filter.branch;
    const docIds = [doctor._id, (doctor as any).user, req.user?._id].filter(Boolean);
    filter.$or = [{ doctor: { $in: docIds } }, { requestedBy: { $in: docIds } }];
  }

  const requests = await AdmissionRequest.find(filter)
    .populate("patient")
    .populate("doctor", "name specialization")
    .populate("department", "name")
    .sort({ createdAt: -1 });

  res.json({ status: "success", data: { requests } });
});

export const rejectAdmissionRequest = catchAsync(async (req: Request, res: Response) => {
  if (!["receptionist", "hospital_admin", "super_admin"].includes(req.user!.role)) {
    throw new AppError("Forbidden: You do not have permission to reject admission requests.", 403);
  }
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const requestId = req.params.id;
  const { reason = "" } = req.body;

  const admissionReq = await AdmissionRequest.findOne({ _id: requestId, hospital: hospitalId })
    .populate("patient")
    .populate("doctor");

  if (!admissionReq) {
    throw new AppError("Admission request not found.", 404);
  }

  admissionReq.status = "Rejected";
  await admissionReq.save();

  // Mark related DB notifications as read
  await DbNotification.updateMany(
    { hospital: hospitalId, "data.requestId": requestId },
    { isRead: true }
  );

  // Send Socket Notification back to Doctor Dashboard
  emitToHospital(hospitalId.toString(), "admission_request_update", {
    requestId: admissionReq._id,
    requestNumber: admissionReq.requestNumber,
    status: "Rejected",
    reason,
    timestamp: new Date()
  });

  res.json({ status: "success", data: admissionReq });
});
