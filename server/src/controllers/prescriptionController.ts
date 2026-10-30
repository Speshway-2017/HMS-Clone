import { Request, Response } from "express";
import { buildBranchQuery } from "../utils/branchQueryHelper";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { Prescription } from "../models/Prescription";
import { PrescriptionAuditLog } from "../models/PrescriptionAuditLog";
import { NotificationQueue } from "../models/NotificationQueue";
import { Patient } from "../models/Patient";
import { Doctor } from "../models/Doctor";
import { Appointment } from "../models/Appointment";
import { Hospital } from "../models/Hospital";
import { Department } from "../models/Department";
import { generatePrescriptionPDF } from "../services/pdfService";
import { emitToHospital } from "../config/socket";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import { cloudinary } from "../config/cloudinary";
import { InventoryItem } from "../models/InventoryItem";
import { Invoice } from "../models/Invoice";
import { AuditLog } from "../models/AuditLog";
import { DbNotification } from "../models/DbNotification";
import { ConsultationSession } from "../models/ConsultationSession";

async function getLoggedDoctor(req: Request) {
  const doctor = await Doctor.findOne({ email: req.user!.email, isActive: { $ne: false } });
  if (!doctor) {
    throw new AppError("Doctor profile not found for the logged-in user.", 404);
  }
  return doctor;
}

export function formatAndSanitizeMedications(rawMeds: any[]) {
  if (!Array.isArray(rawMeds)) return [];
  return rawMeds
    .map((m: any) => {
      const name = String(m.name || m.medicineName || "").trim().slice(0, 200);
      if (!name) return null;

      const strength = String(m.strength || "").trim().slice(0, 100);
      const dosage = String(m.dosage || "").trim().slice(0, 100);
      const frequency = String(m.frequency || "").trim().slice(0, 100);
      const duration = String(m.duration || "").trim().slice(0, 100);
      const instructions = String(m.instructions || "").trim().slice(0, 500);

      // Compute total recommended quantity if missing
      let qty = Number(m.quantity);
      if (!qty || isNaN(qty) || qty <= 0) {
        const dNum = parseFloat(dosage) || 1;
        const fNum = parseFloat(frequency) || 1;
        const durNum = parseFloat(duration) || 1;
        qty = dNum * fNum * durNum;
      }

      return {
        name,
        strength,
        dosage,
        frequency,
        duration,
        quantity: Math.max(1, Math.round(qty)),
        instructions,
        status: m.status || "Pending",
        prescribedAt: m.prescribedAt ? new Date(m.prescribedAt) : new Date(),
        morning: !!m.morning,
        afternoon: !!m.afternoon,
        night: !!m.night,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
}

/**
 * Core business function to create or update a prescription.
 * Runs atomically inside a Mongoose transaction session.
 */
export async function createOrUpdatePrescriptionCore(
  session: mongoose.ClientSession,
  hospitalId: Types.ObjectId,
  doctor: any,
  appointmentId: string,
  data: {
    medications: any[];
    labOrders?: string[];
    radiologyOrders?: string[];
    diagnosis?: string;
    chiefComplaint?: string;
    clinicalNotes?: string;
    advice?: string;
    followUpDate?: Date | null;
  },
  reqHostUrl: string
) {
  // 1. Sanitize medications
  const medsFormatted = formatAndSanitizeMedications(data.medications || []);
  const hasMed = medsFormatted.length > 0;
  const hasLab = data.labOrders && data.labOrders.length > 0 && data.labOrders.some(l => l && l.trim());
  const hasRadio = data.radiologyOrders && data.radiologyOrders.length > 0 && data.radiologyOrders.some(r => r && r.trim());

  if (!hasMed && !hasLab && !hasRadio) {
    throw new AppError("Cannot save empty prescription. At least one medicine, lab test, or radiology order must be prescribed.", 400);
  }

  // 2. Load profiles
  const appointment = await Appointment.findOne({ _id: appointmentId, hospital: hospitalId }).session(session);
  if (!appointment) {
    throw new AppError("Associated appointment not found.", 404);
  }

  const patient = await Patient.findOne({ _id: appointment.patient, hospital: hospitalId }).session(session);
  if (!patient) {
    throw new AppError("Patient profile not found.", 404);
  }

  const hospital = await Hospital.findById(hospitalId).session(session);
  if (!hospital) {
    throw new AppError("Hospital profile not found.", 404);
  }

  const department = appointment.department ? await Department.findById(appointment.department).session(session) : null;

  // 3. Find existing or instantiate new prescription
  let prescription = await Prescription.findOne({ appointment: appointmentId, hospital: hospitalId }).session(session);
  const isNew = !prescription;

  const diagnosisVal = String(data.diagnosis || appointment.diagnosis || "Consultation visit").trim().slice(0, 500);
  const chiefComplaintVal = String(data.chiefComplaint || appointment.chiefComplaint || "").trim().slice(0, 1000);
  const clinicalNotesVal = String(data.clinicalNotes || appointment.clinicalNotes || "").trim().slice(0, 5000);
  const adviceVal = String(data.advice || appointment.advice || "").trim().slice(0, 2000);
  const followUpDateVal = data.followUpDate !== undefined ? data.followUpDate : (appointment.followUpDate || null);

  if (!prescription) {
    const count = await Prescription.countDocuments({ hospital: hospitalId }).session(session);
    const sequence = String(count + 1).padStart(6, "0");
    const currentYear = new Date().getFullYear();
    const rxNumber = `RX-${currentYear}-${sequence}`;

    const targetBranch = appointment.branch || doctor.branch || null;
    const [newRx] = await Prescription.create([{
      hospital: hospitalId,
      branch: targetBranch,
      patient: patient._id,
      appointment: appointmentId,
      consultation: appointmentId,
      doctor: doctor._id,
      department: department ? department._id : null,
      prescriptionNumber: rxNumber,
      diagnosis: diagnosisVal,
      chiefComplaint: chiefComplaintVal,
      clinicalNotes: clinicalNotesVal,
      medications: medsFormatted,
      labOrders: data.labOrders || [],
      radiologyOrders: data.radiologyOrders || [],
      advice: adviceVal,
      followUpDate: followUpDateVal,
      status: "Pending",
      deliveryStatus: {
        mobile: "pending",
        pharmacy: "pending"
      }
    }], { session });
    prescription = newRx;
  } else {
    if (!prescription.prescriptionNumber) {
      const count = await Prescription.countDocuments({ hospital: hospitalId }).session(session);
      const sequence = String(count + 1).padStart(6, "0");
      const currentYear = new Date().getFullYear();
      prescription.prescriptionNumber = `RX-${currentYear}-${sequence}`;
    }
    prescription.diagnosis = diagnosisVal;
    prescription.chiefComplaint = chiefComplaintVal;
    prescription.clinicalNotes = clinicalNotesVal;
    prescription.medications = medsFormatted as any;
    prescription.labOrders = data.labOrders || [];
    prescription.radiologyOrders = data.radiologyOrders || [];
    prescription.advice = adviceVal;
    prescription.followUpDate = followUpDateVal;
    prescription.status = "Pending";
    prescription.deliveryStatus = {
      mobile: "pending",
      pharmacy: "pending"
    };
    await prescription.save({ session });
  }

  // Also sync ConsultationSession draft if present
  await ConsultationSession.findOneAndUpdate(
    { appointment: appointmentId, hospital: hospitalId },
    {
      $set: {
        prescriptions: medsFormatted,
        diagnosis: diagnosisVal,
        clinicalNotes: clinicalNotesVal,
        advice: adviceVal
      }
    },
    { session }
  );

  // Narrow the prescription type for the compiler
  if (!prescription) {
    throw new AppError("Failed to initialize prescription.", 500);
  }

  // 4. Expiry token 7 days
  const token = jwt.sign(
    { prescriptionId: prescription._id, patientId: patient._id },
    env.jwtSecret,
    { expiresIn: "7d" }
  );

  const verificationUrl = `${env.clientUrl}/verify-prescription/${prescription._id}`;

  // 5. Generate secure PDF file
  const secureDir = path.join(__dirname, "../../../secure_prescriptions");
  if (!fs.existsSync(secureDir)) {
    fs.mkdirSync(secureDir, { recursive: true });
  }
  const pdfPath = path.join(secureDir, `${prescription._id}.pdf`);

  await generatePrescriptionPDF({
    prescriptionId: prescription._id.toString(),
    prescriptionNumber: prescription.prescriptionNumber || "",
    hospitalName: hospital.name,
    hospitalAddress: hospital.address,
    hospitalPhone: hospital.contactPhone,
    hospitalEmail: hospital.contactEmail,
    hospitalLogoUrl: hospital.logoUrl,
    patientName: patient.name,
    patientAge: patient.age ?? null,
    patientGender: patient.gender,
    patientUhid: patient.uhid || "",
    doctorName: doctor.name,
    doctorLicenseNo: doctor.licenseNo,
    doctorSpecialization: doctor.specialization,
    departmentName: department ? department.name : "General OPD",
    visitDate: prescription.createdAt ? new Date(prescription.createdAt) : new Date(),
    diagnosis: prescription.diagnosis || "",
    chiefComplaint: prescription.chiefComplaint || "",
    clinicalNotes: prescription.clinicalNotes || "",
    medications: medsFormatted,
    labOrders: (prescription.labOrders as string[]) || [],
    radiologyOrders: (prescription.radiologyOrders as string[]) || [],
    advice: prescription.advice || "",
    followUpDate: prescription.followUpDate ? new Date(prescription.followUpDate) : null,
    verificationUrl
  }, pdfPath);

  // Upload to Cloudinary
  const uploadResult = await cloudinary.uploader.upload(pdfPath, {
    folder: "hms/prescriptions",
    resource_type: "auto"
  });

  // Cleanup local temp file
  try {
    fs.unlinkSync(pdfPath);
  } catch (err) {
    console.error("Failed to delete local temp prescription PDF:", err);
  }

  const downloadUrl = uploadResult.secure_url;
  prescription.pdfUrl = uploadResult.secure_url;
  prescription.downloadUrl = downloadUrl;
  await prescription.save({ session });

  const safeRx = prescription;

  // 6. Queue Alerts
  if (patient.phone) {
    const notifyBody = `Dear ${patient.name},

Your consultation has been completed.
Doctor: Dr. ${doctor.name}
Department: ${department ? department.name : "General OPD"}
Prescription is ready.
Download your prescription securely:
${downloadUrl}

${hospital.name}`;

    await NotificationQueue.create([{
      prescription: safeRx._id,
      type: "whatsapp",
      recipient: patient.phone,
      content: notifyBody,
      status: "pending",
      attempts: 0
    }], { session });
  }

  if (patient.email) {
    const emailBody = `Dear ${patient.name},

Your consultation with Dr. ${doctor.name} has been completed.
Department: ${department ? department.name : "General OPD"}

Your digital prescription is ready for download. Please find the attached PDF or download it securely from the link below:
${downloadUrl}

Best regards,
${hospital.name}`;

    await NotificationQueue.create([{
      prescription: safeRx._id,
      type: "email",
      recipient: patient.email,
      content: emailBody,
      emailSubject: `Your digital prescription from ${hospital.name}`,
      pdfPath,
      status: "pending",
      attempts: 0
    }], { session });
  }

  // 7. Write Audit Log
  if (isNew) {
    await PrescriptionAuditLog.create([{
      prescription: safeRx._id,
      doctor: doctor._id,
      patient: patient._id,
      createdTime: new Date()
    }], { session });
  } else {
    await PrescriptionAuditLog.findOneAndUpdate(
      { prescription: safeRx._id },
      { $set: { createdTime: new Date() } },
      { session }
    );
  }

  // Update deliveryStatus to reflect enqueued jobs
  if (safeRx.deliveryStatus) {
    safeRx.deliveryStatus.pharmacy = "delivered";
  }
  await safeRx.save({ session });

  // 8. Real-time updates via Socket.IO
  emitToHospital(hospitalId.toString(), "prescription:new", {
    _id: safeRx._id,
    patientName: patient.name,
    patientAge: patient.age,
    patientGender: patient.gender,
    patientUhid: patient.uhid || "",
    doctorName: doctor.name,
    departmentName: department ? department.name : "General OPD",
    medicines: medsFormatted.map(m => `${m.name}${m.strength ? ` (${m.strength})` : ""}`),
    date: new Date().toISOString().split("T")[0],
    status: "Pending"
  });

  emitToHospital(hospitalId.toString(), "prescription:updated", safeRx);

  // Trigger page invalidation and UI updates for Timeline and Consultation Status
  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "PRESCRIPTION_GENERATED",
    prescriptionId: safeRx._id,
    appointmentId: appointmentId
  });

  return safeRx;
}

/**
 * Controller endpoint: Save or Update prescription explicitly (e.g. Save Prescription click)
 */
export const savePrescription = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const doctor = await getLoggedDoctor(req);
  const { appointmentId, medications, labOrders, radiologyOrders, diagnosis, chiefComplaint, clinicalNotes, advice, followUpDate } = req.body;

  if (!appointmentId) {
    throw new AppError("Appointment ID is required to create a prescription.", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reqHostUrl = `${req.protocol}://${req.get("host")}`;
    const prescription = await createOrUpdatePrescriptionCore(
      session,
      hospitalId,
      doctor,
      appointmentId,
      { medications, labOrders, radiologyOrders, diagnosis, chiefComplaint, clinicalNotes, advice, followUpDate },
      reqHostUrl
    );

    await session.commitTransaction();
    res.status(201).json({ status: "success", data: prescription });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

/**
 * Controller endpoint: List all prescriptions (scoped to hospital, for doctor/pharmacist)
 */
export const listPrescriptions = catchAsync(async (req: Request, res: Response) => {
  const { status, patient } = req.query;
  
  const query: any = buildBranchQuery(req.hospitalFilter);
  if (status) {
    if (typeof status === "string") {
      query.status = new RegExp(`^${status}$`, "i");
    } else {
      query.status = status;
    }
  }
  if (patient) {
    query.patient = patient;
  }

  // Enforce doctor data isolation: doctors only see their own prescriptions
  if (req.user!.role === "doctor") {
    const doctor = await getLoggedDoctor(req);
    query.doctor = doctor._id;
  }

  const prescriptions = await Prescription.find(query)
    .populate("patient")
    .populate("doctor")
    .populate("department")
    .sort({ createdAt: -1 });

  res.json({ status: "success", data: prescriptions });
});

/**
 * Controller endpoint: Public Verification (returns patient, doctor, meds)
 */
export const verifyPrescriptionPublic = catchAsync(async (req: Request, res: Response) => {
  const prescriptionId = req.params.id;

  const prescription = await Prescription.findById(prescriptionId)
    .populate("patient")
    .populate("doctor")
    .populate("department")
    .populate("hospital");

  if (!prescription) {
    throw new AppError("Prescription not found.", 404);
  }

  // Update audit log for view
  await PrescriptionAuditLog.findOneAndUpdate(
    { prescription: prescription._id },
    { $set: { viewedTime: new Date() } }
  );

  res.json({
    status: "success",
    data: {
      prescriptionId: prescription._id,
      hospitalName: (prescription.hospital as any).name,
      patientName: (prescription.patient as any).name,
      patientUhid: (prescription.patient as any).uhid,
      patientAge: (prescription.patient as any).age,
      patientGender: (prescription.patient as any).gender,
      doctorName: (prescription.doctor as any).name,
      doctorLicenseNo: (prescription.doctor as any).licenseNo,
      departmentName: prescription.department ? (prescription.department as any).name : "General OPD",
      visitDate: prescription.createdAt,
      diagnosis: prescription.diagnosis,
      chiefComplaint: prescription.chiefComplaint,
      medications: prescription.medications,
      labOrders: prescription.labOrders,
      radiologyOrders: prescription.radiologyOrders,
      advice: prescription.advice,
      followUpDate: prescription.followUpDate,
      status: prescription.status,
    },
  });
});

/**
 * Controller endpoint: Download secure PDF file (verifies signed URL token OR staff JWT auth)
 */
export const downloadPrescription = catchAsync(async (req: Request, res: Response) => {
  const prescriptionId = req.params.id;
  const token = req.query.token as string;

  let verifiedPayload: any = null;

  // 1. Verify access (either signed URL token or valid user session)
  if (token) {
    try {
      verifiedPayload = jwt.verify(token, env.jwtSecret);
      if (verifiedPayload.prescriptionId) {
        if (verifiedPayload.prescriptionId !== prescriptionId) {
          throw new AppError("Invalid signed token for this prescription.", 403);
        }
      } else if (verifiedPayload.id) {
        // Authenticated user token passed in query parameter (e.g. from target="_blank" click)
        req.user = { _id: verifiedPayload.id, name: "Hospital Staff" } as any;
      } else {
        throw new AppError("Invalid token payload.", 403);
      }
    } catch (err: any) {
      throw new AppError("Secure link has expired or is invalid.", 403);
    }
  } else {
    // If no token, request must fall under protect middleware (req.user exists)
    if (!req.user) {
      throw new AppError("Unauthorized access. Token or session required.", 401);
    }
  }

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) {
    throw new AppError("Prescription not found.", 404);
  }

  // Doctor ownership validation
  if (req.user && req.user.role === "doctor") {
    const doctor = await getLoggedDoctor(req);
    if (prescription.doctor.toString() !== doctor._id.toString()) {
      throw new AppError("You do not have access to this prescription.", 403);
    }
  }


  // Determine downloadedBy name for Audit Log
  const userName = req.user ? req.user.name : "Patient";

  // 2. Update Audit Log
  await PrescriptionAuditLog.findOneAndUpdate(
    { prescription: prescription._id },
    {
      $set: {
        downloadedTime: new Date(),
        downloadedBy: userName,
      },
    }
  );

  if (prescription.pdfUrl && (prescription.pdfUrl.startsWith("http://") || prescription.pdfUrl.startsWith("https://"))) {
    return res.redirect(prescription.pdfUrl);
  }

  const pdfPath = path.join(__dirname, "../../../secure_prescriptions", `${prescriptionId}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    // Generate PDF on the fly
    const patient = await Patient.findById(prescription.patient);
    const doctor = await Doctor.findById(prescription.doctor);
    const hospital = await Hospital.findById(prescription.hospital);
    const department = prescription.department ? await Department.findById(prescription.department) : null;

    if (!patient || !doctor || !hospital) {
      throw new AppError("Associated patient, doctor, or hospital profile not found.", 404);
    }

    const verificationUrl = `${env.clientUrl}/verify-prescription/${prescription._id}`;

    const secureDir = path.dirname(pdfPath);
    if (!fs.existsSync(secureDir)) {
      fs.mkdirSync(secureDir, { recursive: true });
    }

    const medsFormatted = (prescription.medications || []).map((m: any) => ({
      name: m.name,
      strength: m.strength || "N/A",
      dosage: m.dosage || "1",
      frequency: m.frequency || "1",
      duration: m.duration || "1",
      instructions: m.instructions || "As directed"
    }));

    await generatePrescriptionPDF({
      prescriptionId: prescription._id.toString(),
      prescriptionNumber: prescription.prescriptionNumber || "",
      hospitalName: hospital.name,
      hospitalAddress: hospital.address,
      hospitalPhone: hospital.contactPhone,
      hospitalEmail: hospital.contactEmail,
      hospitalLogoUrl: hospital.logoUrl,
      patientName: patient.name,
      patientAge: patient.age ?? null,
      patientGender: patient.gender,
      patientUhid: patient.uhid || "",
      doctorName: doctor.name,
      doctorLicenseNo: doctor.licenseNo,
      doctorSpecialization: doctor.specialization,
      departmentName: department ? department.name : "Inpatient Department",
      visitDate: prescription.createdAt ? new Date(prescription.createdAt) : new Date(),
      diagnosis: prescription.diagnosis || "",
      chiefComplaint: prescription.chiefComplaint || "",
      clinicalNotes: prescription.clinicalNotes || "",
      medications: medsFormatted,
      labOrders: (prescription.labOrders as string[]) || [],
      radiologyOrders: (prescription.radiologyOrders as string[]) || [],
      advice: prescription.advice || "",
      followUpDate: prescription.followUpDate ? new Date(prescription.followUpDate) : null,
      verificationUrl
    }, pdfPath);
  }

  if (fs.existsSync(pdfPath)) {
    // Lazy migration: Upload existing local prescription to Cloudinary on first view
    const uploadResult = await cloudinary.uploader.upload(pdfPath, {
      folder: "hms/prescriptions",
      resource_type: "auto"
    });

    try {
      fs.unlinkSync(pdfPath);
    } catch (err) {
      console.error("Lazy migration cleanup failed:", err);
    }

    prescription.pdfUrl = uploadResult.secure_url;
    prescription.downloadUrl = uploadResult.secure_url;
    await prescription.save();

    return res.redirect(uploadResult.secure_url);
  }

  throw new AppError("Prescription document file could not be generated.", 500);
});

/**
 * Controller endpoint: Update Prescription Status (Pharmacist / Doctor)
 */
export const updatePrescriptionStatus = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const prescriptionId = req.params.id;
  const { status } = req.body;

  const validStatuses = ["Pending", "Preparing", "Ready for Pickup", "Partially Dispensed", "Dispensed", "Completed", "Cancelled"];
  if (!status || !validStatuses.includes(status)) {
    throw new AppError("Invalid prescription status specified.", 400);
  }

  const prescription = await Prescription.findOne({
    _id: prescriptionId,
    ...req.hospitalFilter
  }).populate("patient doctor department");

  if (!prescription) {
    throw new AppError("Prescription not found.", 404);
  }

  prescription.status = status;
  if (Array.isArray(prescription.medications)) {
    prescription.medications.forEach((m: any) => {
      m.status = status;
    });
  }
  if (req.user) {
    prescription.dispensedBy = req.user._id as any;
    prescription.dispensedByName = req.user.name || "Pharmacist";
    if (status === "Dispensed" || status === "Completed") {
      prescription.dispensedAt = new Date();
    }
  }
  await prescription.save();

  if (prescription.appointment) {
    await ConsultationSession.findOneAndUpdate(
      { appointment: prescription.appointment, hospital: hospitalId },
      { $set: { "prescriptions.$[].status": status } }
    );
  }

  // Create notifications for Doctor & Patient
  await DbNotification.create({
    hospital: hospitalId,
    title: `Prescription Status Updated: ${status}`,
    message: `Prescription ${prescription.prescriptionNumber || prescription._id} is now ${status}.`,
    type: "general",
    recipientRole: "doctor",
    recipientDoctor: prescription.doctor._id
  });

  emitToHospital(hospitalId.toString(), "prescription:updated", prescription);
  emitToHospital(hospitalId.toString(), "dashboard_update", {
    type: "PRESCRIPTION_STATUS_CHANGED",
    prescriptionId: prescription._id,
    status: prescription.status,
    timestamp: new Date()
  });

  res.json({
    status: "success",
    data: { prescription }
  });
});

/**
 * Controller endpoint: Dispense Medicines (Pharmacist)
 */
export const dispensePrescription = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital as Types.ObjectId;
  const prescriptionId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      ...buildBranchQuery(req.hospitalFilter)
    }).populate("patient doctor department").session(session);

    if (!prescription) {
      throw new AppError("Prescription not found.", 404);
    }

    if (prescription.status === "Completed" || prescription.status === "Dispensed") {
      throw new AppError("Prescription has already been fully dispensed and completed.", 400);
    }

    // One Prescription = One Pharmacy Invoice validation check (except for Partially Dispensed ones)
    if (prescription.status !== "Partially Dispensed") {
      const existingInvoice = await Invoice.findOne({
        hospital: hospitalId,
        billingType: "PHARMACY",
        prescription: prescription._id
      }).session(session);

      if (existingInvoice) {
        throw new AppError("This prescription has already been dispensed and an invoice generated.", 400);
      }
    }

    // Safety check: verify patient
    if (req.body.patientId && prescription.patient._id.toString() !== req.body.patientId.toString()) {
      throw new AppError("Safety Alert: Patient identification mismatch! Medicines of Patient A cannot be dispensed to Patient B.", 400);
    }

    const items = req.body.items;
    if (!items || items.length === 0) {
      throw new AppError("Cannot submit empty medicines.", 400);
    }

    const names = items.map((i: any) => i.name.trim().toLowerCase());
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      throw new AppError("Cannot submit duplicate medicines in dispensing list.", 400);
    }

    // Deduct stock and validate
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new AppError(`Cannot dispense zero or negative quantity for medicine: ${item.name}`, 400);
      }
      let invItem = await InventoryItem.findOne({
        ...req.hospitalFilter,
        name: new RegExp(`^${item.name.trim()}$`, "i"),
        category: "medicines"
      }).session(session);

      if (!invItem) {
        invItem = await InventoryItem.findOne({
          hospital: hospitalId,
          name: new RegExp(`^${item.name.trim()}$`, "i"),
          category: "medicines"
        }).session(session);
      }

      if (!invItem) {
        throw new AppError(`Medicine ${item.name} not found in inventory.`, 404);
      }

      if (invItem.stockQty < item.quantity) {
        throw new AppError(`Insufficient stock for ${item.name}. Available: ${invItem.stockQty}, Requested: ${item.quantity}.`, 400);
      }

      // Check expiry date
      const descParts = invItem.description ? invItem.description.split(" | ") : [];
      const expiryDateStr = descParts[1] ? descParts[1].trim() : "";
      if (expiryDateStr) {
        const expiryDate = new Date(expiryDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          throw new AppError(`Cannot dispense expired medicine: ${item.name} (Expired on ${expiryDateStr}).`, 400);
        }
      }

      invItem.stockQty -= item.quantity;
      await invItem.save({ session });
    }

    // Determine status (Partial vs Complete)
    const isPartial = req.body.isPartial || false;
    const finalStatus = isPartial ? "Partially Dispensed" : "Dispensed";
    prescription.status = finalStatus;
    prescription.dispensedAt = new Date();
    if (req.user) {
      prescription.dispensedBy = req.user._id as any;
      prescription.dispensedByName = req.user.name || "Pharmacist";
    }
    if (Array.isArray(prescription.medications)) {
      prescription.medications.forEach((m: any) => {
        m.status = finalStatus;
      });
    }
    await prescription.save({ session });

    if (prescription.appointment) {
      await ConsultationSession.findOneAndUpdate(
        { appointment: prescription.appointment, hospital: hospitalId },
        { $set: { "prescriptions.$[].status": finalStatus } },
        { session }
      );
    }

    // Generate Invoice Items and totals
    const roundToTwo = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

    let subtotal = 0;
    const invoiceItems = items.map((item: any) => {
      const amt = roundToTwo(Number(item.price) || 0);
      const qty = Number(item.quantity) || 1;
      subtotal = roundToTwo(subtotal + roundToTwo(amt * qty));
      return {
        description: `${item.name} (Batch: ${item.batchNo || "N/A"})`,
        category: "Pharmacy",
        quantity: qty,
        amount: amt
      };
    });

    const taxRate = Number(req.body.taxRate) || 0;
    const discount = roundToTwo(Number(req.body.discount) || 0);
    const taxAmount = roundToTwo(subtotal * (taxRate / 100));
    const total = Math.max(0, roundToTwo(subtotal + taxAmount - discount));

    const newInvoiceDoc = new Invoice({
      hospital: hospitalId,
      branch: prescription.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null,
      patient: prescription.patient._id,
      appointment: prescription.appointment,
      prescription: prescription._id,
      items: invoiceItems,
      taxRate,
      discount: roundToTwo(discount),
      discountType: "fixed",
      totals: {
        subtotal: roundToTwo(subtotal),
        taxAmount: roundToTwo(taxAmount),
        total: roundToTwo(total),
        patientBalance: roundToTwo(total),
        insuranceCovered: 0,
        serviceFee: 0,
        discount: roundToTwo(discount)
      },
      billingType: "PHARMACY",
      status: "pending",
      issuedAt: new Date(),
      provisionalData: {
        doctorId: prescription.doctor._id,
        departmentId: prescription.department?._id || null,
        date: new Date(),
        notes: `Prescription Ref: ${prescription.prescriptionNumber || prescription._id}`
      }
    });
    const newInvoice = await newInvoiceDoc.save({ session });

    // Update audit logs
    await PrescriptionAuditLog.findOneAndUpdate(
      { prescription: prescription._id },
      { $set: { dispensedTime: new Date() } },
      { session }
    );

    const auditLogDoc = new AuditLog({
      hospital: hospitalId,
      user: req.user!._id,
      action: "MEDICINE_DISPENSE",
      details: `Dispensed medicines for Prescription Ref: ${prescription.prescriptionNumber || prescription._id}. Generated Invoice ID: ${newInvoice._id}`,
      resource: "Prescription",
      resourceId: prescription._id
    });
    await auditLogDoc.save({ session });

    // Create notifications — use insertMany with ordered:true for multi-doc session safety
    await DbNotification.insertMany([
      {
        hospital: hospitalId,
        title: "Prescription Dispensed",
        message: `Prescription ${prescription.prescriptionNumber || prescription._id} for patient ${(prescription.patient as any).name} has been dispensed.`,
        type: "general",
        recipientRole: "doctor",
        recipientDoctor: prescription.doctor._id
      },
      {
        hospital: hospitalId,
        title: "Payment Pending",
        message: `Pharmacy invoice for patient ${(prescription.patient as any).name} is pending payment.`,
        type: "invoice",
        recipientRole: "receptionist"
      },
      {
        hospital: hospitalId,
        title: "New Pharmacy Payment Pending",
        message: `Pharmacy invoice for patient ${(prescription.patient as any).name} is pending payment.`,
        type: "invoice",
        recipientRole: "accountant"
      }
    ], { session, ordered: true });

    await session.commitTransaction();
    session.endSession();

    // Emit Socket updates
    emitToHospital(hospitalId.toString(), "prescription:dispensed", prescription);
    emitToHospital(hospitalId.toString(), "prescription:updated", prescription);
    emitToHospital(hospitalId.toString(), "dashboard_update", {
      type: "NEW_INVOICE",
      invoiceId: newInvoice._id,
      billingType: newInvoice.billingType,
      total: total,
      timestamp: new Date()
    });

    res.json({
      status: "success",
      data: {
        prescription,
        invoice: newInvoice
      }
    });
  } catch (err) {
    try {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
    } catch (abortErr: any) {
      console.error("Failed to abort transaction:", abortErr.message);
    }
    session.endSession();
    console.error("Pharmacy Dispensing error:", err);
    throw err;
  }
});

/**
 * Controller endpoint: Get Patient Prescriptions (Patient Portal API support)
 */
export const getPatientPrescriptions = catchAsync(async (req: Request, res: Response) => {
  const patientIds: any[] = [];

  if (req.query.patientId) {
    patientIds.push(req.query.patientId);
  }

  if (req.user) {
    patientIds.push(req.user._id);

    // Look up the corresponding Patient model document
    const patientDoc = await Patient.findOne({
      $or: [
        { _id: req.user._id },
        { user: req.user._id },
        { email: req.user.email },
        { phone: req.user.phone },
      ],
    });

    if (patientDoc) {
      patientIds.push(patientDoc._id);
    }
  }

  if (patientIds.length === 0) {
    throw new AppError("Patient identification is required.", 400);
  }

  const prescriptions = await Prescription.find({ patient: { $in: patientIds } })
    .populate("doctor", "name specialization department avatar")
    .populate("department", "name")
    .populate("hospital", "name")
    .sort({ createdAt: -1 });

  res.json({ status: "success", data: prescriptions });
});
