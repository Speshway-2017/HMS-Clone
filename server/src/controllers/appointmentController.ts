import { Request, Response } from "express";
import { z } from "zod";
import { Appointment, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { Invoice } from "../models/Invoice";
import { Patient } from "../models/Patient";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { emitToHospital } from "../config/socket";
import { logAudit } from "../utils/auditLogger";

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
  patient: z.string().min(1),
  doctor: z.string().min(1),
  department: z.string().optional().nullable(),
  date: z.coerce.date(),
  time: z.string().min(1),
  type: z.enum(APPOINTMENT_TYPES as unknown as [string, ...string[]]).optional().default("Appointment"),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  notes: z.string().optional().default(""),
});

export const listAppointments = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req, 50);
  const { status, doctor, from, to, dateMode } = req.query as Record<string, string | undefined>;

  const filter: Record<string, any> = { ...req.hospitalFilter };
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;

  // Enforce doctor data isolation for appointment listing
  if (req.user!.role === "doctor") {
    const loggedDoctor = await getLoggedDoctor(req);
    filter.doctor = loggedDoctor._id;
    if (filter.status === "pending_payment") {
      filter.status = "never_match_status";
    } else if (!status) {
      filter.status = { $ne: "pending_payment" };
    }
  }

  // Enforce patient data isolation for appointment listing
  if (req.user!.role === "patient") {
    const patientDoc = await Patient.findOne({ email: req.user!.email });
    if (patientDoc) {
      filter.patient = patientDoc._id;
    } else {
      filter.patient = "000000000000000000000000";
    }
  }

  if (dateMode === "other_days") {
    const today = new Date();
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    filter.date = { $gt: endOfToday };
    filter.status = { $nin: ["completed", "cancelled", "no_show"] };
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
      .populate("patient", "name uhid")
      .populate("doctor", "name specialization")
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
  const doctor = await Doctor.findById(body.doctor);
  if (!doctor || doctor.isActive === false) {
    throw new AppError("The selected doctor is inactive, retired, or does not exist.", 400);
  }

  const hospitalId = req.hospitalFilter?.hospital || doctor.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital information is required to book an appointment.", 400);
  }

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

  // 2. Prevent two active appointments for the same doctor and same time slot
  const slotClash = await Appointment.findOne({
    hospital: hospitalId,
    doctor: body.doctor,
    date: body.date,
    time: body.time,
    status: { $nin: ["cancelled", "no_show", "completed", "missed"] }
  });
  if (slotClash) {
    throw new AppError("This time slot is already booked for this doctor. Please choose a different slot.", 409);
  }

  const referenceId = await generateReferenceId(hospitalId.toString(), new Date(body.date));

  const appointment = await Appointment.create({
    ...body,
    hospital: hospitalId,
    referenceId,
  });

  emitToHospital(hospitalId.toString(), "appointment_created", { appointmentId: appointment._id, referenceId });

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
  const appointment = await Appointment.findOneAndUpdate(filter, body, {
    new: true,
    runValidators: true,
  });
  if (!appointment) {
    throw new AppError("Appointment not found or unauthorized.", 403);
  }

  if (req.hospitalFilter?.hospital) {
    emitToHospital(req.hospitalFilter.hospital, "appointment_updated", { appointmentId: appointment._id, status: appointment.status });
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
