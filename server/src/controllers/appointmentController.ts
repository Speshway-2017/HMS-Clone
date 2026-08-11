import { Request, Response } from "express";
import { z } from "zod";
import { Appointment, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { Invoice } from "../models/Invoice";
import { Patient } from "../models/Patient";
import { Payment } from "../models/Payment";
import { Queue } from "../models/Queue";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { emitToHospital } from "../config/socket";
import { logAudit } from "../utils/auditLogger";
import { validateAppointmentTimeRestriction } from "../utils/appointmentTimeValidation";
import { AppointmentSlotService } from "../services/appointmentSlotService";
import { createDoctorNotification } from "../utils/notificationHelper";

async function generateReferenceId(hospitalId: string, bookingDate: Date): Promise<string> {
  const dateStr = bookingDate.toISOString().split("T")[0].replace(/-/g, "");
  const aptPrefix = `APT-${dateStr}-`;
  
  const latestAppt = await Appointment.findOne({
    hospital: hospitalId,
    referenceId: new RegExp(`^${aptPrefix}`)
  }).sort({ createdAt: -1 });

  let nextSerial = 1;
  if (latestAppt) {
    const serialPart = latestAppt.referenceId.replace(aptPrefix, "");
    const lastSerial = parseInt(serialPart, 10);
    if (!isNaN(lastSerial)) {
      nextSerial = lastSerial + 1;
    }
  }
  return `${aptPrefix}${String(nextSerial).padStart(6, "0")}`;
}

async function getLoggedDoctor(req: Request) {
  const doctor = await Doctor.findOne({ email: req.user!.email, isActive: { $ne: false } });
  if (!doctor) {
    throw new AppError("Doctor profile not found for the logged-in user.", 404);
  }
  return doctor;
}

const appointmentSchema = z.object({
  patient: z.string().optional().nullable().default(""),
  doctor: z.string().min(1, "Doctor ID is required."),
  department: z.string().optional().nullable(),
  date: z.coerce.date(),
  time: z.string().min(1, "Time slot is required."),
  type: z.string().optional().default("Appointment"),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  meetingLink: z.string().optional().default(""),
  notes: z.string().optional().default(""),

  reason: z.string().optional().default(""),

  billingStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
});

import { buildBranchQuery } from "../utils/branchQueryHelper";

export const listAppointments = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req, 50);
  const { status, doctor, from, to, dateMode } = req.query as Record<string, string | undefined>;

  const filter: Record<string, any> = buildBranchQuery(req.hospitalFilter);
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;

  // Enforce doctor data isolation for appointment listing
  if (req.user!.role === "doctor") {
    const loggedDoctor = await getLoggedDoctor(req);
    filter.doctor = loggedDoctor._id;
  }

  // Enforce patient data isolation for appointment listing
  if (req.user!.role === "patient") {
    // Delete hospital filter for patient role so all appointments booked for this patient across hospitals are fetched
    delete filter.hospital;

    const userEmail = (req.user!.email || "").trim();
    const userPhone = (req.user!.phone || "").replace(/\D/g, "").slice(-10);
    const userName = (req.user!.name || "").trim();
    const userId = req.user!._id;

    const patientConditions: any[] = [];
    if (userId) {
      patientConditions.push({ user: userId });
    }
    if (userEmail) {
      patientConditions.push({ email: { $regex: `^${userEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
    }
    if (userPhone && userPhone.length >= 7) {
      patientConditions.push({ phone: { $regex: `${userPhone}$` } });
    }
    if (userName) {
      patientConditions.push({ name: { $regex: `^${userName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
    }

    const patientDocs = await Patient.find({
      $or: patientConditions.length > 0 ? patientConditions : [{ user: userId }]
    }).select("_id");

    const patientIds = patientDocs.map(p => p._id);
    if (patientIds.length > 0) {
      filter.patient = { $in: patientIds };
    } else {
      filter.patient = "000000000000000000000000";
    }
  }

  if (dateMode === "today") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    filter.date = { $gte: startOfToday, $lte: endOfToday };
  } else if (dateMode === "other_days" || dateMode === "scheduled") {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    filter.date = { $gt: endOfToday };
    filter.status = { $nin: ["completed", "cancelled", "no_show"] };
  } else if (dateMode === "past" || dateMode === "missed") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    filter.date = { $lt: startOfToday };
    filter.status = { $nin: ["completed", "cancelled"] };
  } else if (dateMode === "completed") {
    filter.status = { $in: ["completed", "cancelled", "no_show"] };
  } else if (from || to) {
    filter.date = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }

  const [appointments, total, todayCount] = await Promise.all([
    Appointment.find(filter)
      .populate("patient", "name uhid phone age gender")
      .populate("doctor", "name specialization department consultationFee")
      .populate("department", "name")
      .sort(dateMode === "completed" ? { date: -1, time: -1 } : { date: 1, time: 1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(filter),
    Appointment.countDocuments({
      ...filter,
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(24, 0, 0, 0)),
      },
    }),
  ]);

  res.json({ status: "success", ...paginatedResponse(appointments, total, { page, limit, skip }), counts: { total, today: todayCount } });
});

export const createAppointment = catchAsync(async (req: Request, res: Response) => {
  const body = appointmentSchema.parse(req.body);


  // Normalize appointment type string to valid APPOINTMENT_TYPES enum
  let apptType: "Appointment" | "Walk-in" | "Emergency" | "Video Consultation" | "Consultation" = "Appointment";
  const rawType = (req.body.type || body.type || "").toString().toLowerCase();
  if (rawType.includes("video") || rawType.includes("online")) {
    apptType = "Video Consultation";
  } else if (rawType.includes("walk")) {
    apptType = "Walk-in";
  } else if (rawType.includes("emergency")) {
    apptType = "Emergency";
  } else if (rawType.includes("consultation") && !rawType.includes("opd") && !rawType.includes("person")) {
    apptType = "Consultation";
  } else {
    apptType = "Appointment";
  }
  body.type = apptType;

  const doctor = await Doctor.findById(body.doctor);
  if (!doctor || doctor.isActive === false) {
    throw new AppError("The selected doctor is inactive, retired, or does not exist.", 400);
  }

  const hospitalId = req.hospitalFilter?.hospital || doctor.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital information is required to book an appointment.", 400);
  }

  // Auto-find or create patient profile for logged in user
  if (!body.patient || req.user!.role === "patient") {
    let patientDoc = null;
    const userEmail = (req.user!.email || "").trim();
    const userPhone = (req.user!.phone || "").replace(/\D/g, "").slice(-10);
    const userId = req.user!._id;

    if (userId) {
      patientDoc = await Patient.findOne({ user: userId });
    }
    if (!patientDoc && userEmail) {
      patientDoc = await Patient.findOne({ email: { $regex: `^${userEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } });
    }
    if (!patientDoc && userPhone && userPhone.length >= 7) {
      patientDoc = await Patient.findOne({ phone: { $regex: `${userPhone}$` } });
    }

    if (patientDoc) {
      body.patient = patientDoc._id.toString();
    } else if (req.user!.role === "patient") {
      const generateDigits = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");
      const newPat = await Patient.create({
        user: userId,
        hospital: hospitalId,
        uhid: `UHID-${generateDigits(10)}`,
        patientCode: `PAT-${generateDigits(6)}`,
        name: req.user!.name || "Patient",
        email: userEmail,
        phone: req.user!.phone || "",
        status: "opd",
        isActive: true,
      });
      body.patient = newPat._id.toString();
  // If patient field is missing or logged in as patient role, auto-find patient document
  if (!body.patient || req.user!.role === "patient") {
    const patientDoc = await Patient.findOne({ email: req.user!.email });
    if (patientDoc) {
      body.patient = patientDoc._id.toString();
    }
  }

  if (!body.department && doctor.department) {
    body.department = doctor.department.toString();
  }

  // 1. Duplicate appointment guard: Patient + Doctor + Date (any status except cancelled/no_show/completed/missed)
  if (body.patient && body.doctor && body.date) {
    const startOfDay = new Date(body.date as unknown as Date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(body.date as unknown as Date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await Appointment.findOne({
      hospital: hospitalId,
      patient: body.patient,
      doctor: body.doctor,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "no_show", "completed", "missed"] },
    });

    if (existing) {
      const apptDate = new Date(existing.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      throw new AppError(
        `This patient already has an appointment with Dr. ${doctor.name} on ${apptDate}. Please complete, cancel or reschedule the existing appointment before creating another appointment.`,
        409
      );
    }
  }

  // 2. Prevent two active appointments for the same doctor and same time slot.
  //    Uses AppointmentSlotService.checkSlotConflict — the SAME logic as the display layer.
  const slotClash = await AppointmentSlotService.checkSlotConflict(
    body.doctor,
    body.date as unknown as Date,
    body.time,
    hospitalId
  );
  if (slotClash) {
    throw new AppError(
      "This appointment slot has already been booked. Please choose another available slot.",
      409
    );
  }

  // 3. Prevent patient from booking multiple appointments at the exact same date and time slot (with ANY doctor)
  if (body.patient && body.date && body.time) {
    const patientSlotClash = await AppointmentSlotService.checkPatientSlotConflict(
      body.patient,
      body.date as unknown as Date,
      body.time,
      hospitalId
    );
    if (patientSlotClash) {
      const otherDocName = (patientSlotClash.doctor as any)?.name || "another doctor";
      throw new AppError(
        `Patient already has an active appointment scheduled at ${body.time} with Dr. ${otherDocName}. A patient cannot book appointments with multiple doctors at the exact same time slot.`,
        409
      );
    }
  }

  const referenceId = await generateReferenceId(hospitalId.toString(), new Date(body.date));
  const branchId = req.hospitalFilter?.branch || (req.body as any).branch || null;
  const appointment = await Appointment.create({
    ...body,
    hospital: hospitalId,
    branch: branchId,
    referenceId,
  });

  // If billingStatus is 'Paid', automatically generate a paid Invoice and Payment record
  if (body.billingStatus === "Paid" || req.body.billingStatus === "Paid") {
    let consultationFee = 500;
    if (doctor.consultationFee) {
      const cleanedFee = String(doctor.consultationFee).replace(/[₹, \s]/g, "");
      const parsedFee = parseFloat(cleanedFee);
      if (!isNaN(parsedFee)) {
        consultationFee = parsedFee;
      }
    }

    const invoice = await Invoice.create({
      hospital: hospitalId,
      patient: body.patient,
      appointment: appointment._id,
      billingType: "OP",
      items: [
        {
          description: `${body.type || "OPD Consultation"} Fee`,
          category: "consultation",
          quantity: 1,
          amount: consultationFee,
        },
      ],
      taxRate: 0,
      serviceFee: 0,
      discount: 0,
      insuranceCoveragePercent: 0,
      status: "paid",
      issuedAt: new Date(),
      dueDate: new Date(),
      totals: {
        subtotal: consultationFee,
        taxAmount: 0,
        serviceFee: 0,
        discount: 0,
        insuranceCovered: 0,
        total: consultationFee,
        patientBalance: 0,
      },
    });

    let paymentMethod = body.paymentMethod || req.body.paymentMethod || "UPI";
    if (paymentMethod === "NetBanking") {
      paymentMethod = "Net Banking";
    }
    if (!["UPI", "Cash", "Card", "Net Banking", "Cheque", "Mixed"].includes(paymentMethod)) {
      paymentMethod = "UPI";
    }

    const transactionId = `TXN-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    await Payment.create({
      hospital: hospitalId,
      invoice: invoice._id,
      patient: body.patient,
      amount: consultationFee,
      paymentMethod,
      transactionId,
      paidAt: new Date(),
    });
  }

  const populatedAppt = await Appointment.findById(appointment._id)
    .populate("patient", "name uhid phone age gender")
    .populate("doctor", "name specialization department consultationFee")
    .populate("department", "name");

  emitToHospital(hospitalId.toString(), "appointment_created", {
    appointmentId: appointment._id,
    referenceId,
    appointment: populatedAppt,
  });
  emitToHospital(hospitalId.toString(), "patient_updated", { patientId: body.patient });
  emitToHospital(hospitalId.toString(), "appointments_updated", { appointmentId: appointment._id });
  emitToHospital(hospitalId.toString(), "appointment_created", { appointmentId: appointment._id, referenceId });

  try {
    const patDoc = await Patient.findById(body.patient);
    const patName = patDoc ? patDoc.name : "Patient";
    await createDoctorNotification({
      hospital: hospitalId,
      title: "New Patient Appointment",
      message: `New appointment booked for ${patName} (${referenceId}) on ${new Date(body.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at ${body.time}.`,
      type: "appointment",
      severity: "info",
      recipientDoctor: body.doctor,
      link: "/doctor/op-management",
      data: { appointmentId: appointment._id.toString(), referenceId }
    });
  } catch (err) {
    console.error("Failed to create doctor notification for appointment:", err);
  }

  await logAudit({
    req,
    action: "CREATE_APPOINTMENT",
    entity: "Appointment",
    entityId: appointment._id.toString(),
    details: { referenceId, date: body.date, time: body.time }
  });

  res.status(201).json({ status: "success", data: { appointment } });
});


export const getAppointment = catchAsync(async (req: Request, res: Response) => {
  const filter: any = { _id: req.params.id, ...req.hospitalFilter };
  if (req.user!.role === "doctor") {
    const loggedDoctor = await getLoggedDoctor(req);
    filter.doctor = loggedDoctor._id;
  }

  const appointment = await Appointment.findOne(filter)
    .populate("patient")
    .populate("doctor", "name specialization")
    .populate("department", "name");
  if (!appointment) {
    throw new AppError("Appointment not found or unauthorized.", 403);
  }
  res.json({ status: "success", data: { appointment } });
});

export const updateAppointment = catchAsync(async (req: Request, res: Response) => {
  const filter: any = { _id: req.params.id, ...req.hospitalFilter };
  if (req.user!.role === "doctor") {
    const loggedDoctor = await getLoggedDoctor(req);
    filter.doctor = loggedDoctor._id;
  }

  const body = appointmentSchema.partial().parse(req.body);

  const existingAppt = await Appointment.findOne(filter);
  if (!existingAppt) {
    throw new AppError("Appointment not found or unauthorized.", 403);
  }

  const isCancelling = body.status === "cancelled";
  const isRescheduling = (body.date && new Date(body.date).toISOString() !== new Date(existingAppt.date).toISOString()) || (body.time && body.time !== existingAppt.time);

  if (isCancelling || isRescheduling) {
    validateAppointmentTimeRestriction(existingAppt);
  }

  if (isRescheduling) {
    const targetDate = body.date ? (body.date as unknown as Date) : existingAppt.date;
    const targetTime = body.time || existingAppt.time;
    const targetPatient = existingAppt.patient;

    const patientSlotClash = await AppointmentSlotService.checkPatientSlotConflict(
      targetPatient,
      targetDate,
      targetTime,
      existingAppt.hospital,
      existingAppt._id.toString()
    );
    if (patientSlotClash) {
      const otherDocName = (patientSlotClash.doctor as any)?.name || "another doctor";
      throw new AppError(
        `Patient already has an active appointment scheduled at ${targetTime} with Dr. ${otherDocName}. A patient cannot book appointments with multiple doctors at the exact same time slot.`,
        409
      );
    }
  }

  const appointment = await Appointment.findOneAndUpdate(filter, body, {
    new: true,
    runValidators: true,
  });
  if (!appointment) {
    throw new AppError("Appointment not found or unauthorized.", 404);
  }

  if (body.status) {
    const queueStatusMap: Record<string, string> = {
      completed: "completed",
      in_consultation: "called",
      checked_in: "waiting",
      cancelled: "skipped",
      no_show: "skipped"
    };
    const newQueueStatus = queueStatusMap[body.status];
    if (newQueueStatus) {
      await Queue.updateMany(
        { appointment: appointment._id },
        { status: newQueueStatus }
      );
      const todayStart = new Date(appointment.date || new Date());
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);
      await Queue.updateMany(
        {
          patient: appointment.patient,
          doctor: appointment.doctor,
          createdAt: { $gte: todayStart, $lte: todayEnd }
        },
        { status: newQueueStatus }
      );
    }
  }

  const targetHospital = req.hospitalFilter?.hospital || (appointment.hospital || "").toString();
  if (targetHospital) {
    emitToHospital(targetHospital, "appointment_updated", { appointmentId: appointment._id, status: appointment.status, meetingLink: appointment.meetingLink });
  }

  await logAudit({
    req,
    action: "UPDATE_APPOINTMENT",
    entity: "Appointment",
    entityId: appointment._id.toString(),
    details: body
  });

  res.json({ status: "success", data: { appointment } });
});

export const deleteAppointment = catchAsync(async (req: Request, res: Response) => {
  const filter: any = { _id: req.params.id, ...req.hospitalFilter };
  if (req.user!.role === "doctor") {
    const loggedDoctor = await getLoggedDoctor(req);
    filter.doctor = loggedDoctor._id;
  }

  const appointment = await Appointment.findOneAndDelete(filter);
  if (!appointment) {
    throw new AppError("Appointment not found or unauthorized.", 403);
  }

  if (req.hospitalFilter?.hospital) {
    emitToHospital(req.hospitalFilter.hospital, "appointment_deleted", { appointmentId: req.params.id });
  }

  await logAudit({
    req,
    action: "DELETE_APPOINTMENT",
    entity: "Appointment",
    entityId: req.params.id,
    details: { referenceId: appointment.referenceId }
  });

  res.status(204).send();
});

export const getInvoiceByAppointmentId = catchAsync(async (req: Request, res: Response) => {
  const invoice = await Invoice.findOne({
    appointment: req.params.id,
    hospital: req.hospitalFilter!.hospital,
  });
  if (!invoice) {
    throw new AppError("Invoice not found for this appointment", 404);
  }
  res.json({ status: "success", data: { invoice } });
});

/**
 * GET /appointments/available-slots?doctorId=&date=
 *
 * Unified booked-slots endpoint accessible by BOTH patient and receptionist roles.
 * Returns the list of already-booked time strings for a doctor on a given date,
 * using the canonical AppointmentSlotService — the single source of truth.
 *
 * Frontend must NEVER cache these results between doctor/date changes.
 */
export const getAvailableSlots = catchAsync(async (req: Request, res: Response) => {
  const { doctorId, date } = req.query as Record<string, string>;
  if (!doctorId || !date) {
    throw new AppError("doctorId and date are required query parameters.", 400);
  }

  const bookedSlots = await AppointmentSlotService.getBookedSlots(
    doctorId,
    date,
    req.hospitalFilter?.hospital
  );

  res.json({ status: "success", data: { bookedSlots } });
});
