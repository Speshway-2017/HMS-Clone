import { Request, Response } from "express";
import { z } from "zod";
import { Appointment, APPOINTMENT_STATUSES } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { Invoice } from "../models/Invoice";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";

function generateReferenceId(): string {
  return `APT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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
  type: z.string().optional().default("Consultation"),
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
  const doctor = await Doctor.findOne({ _id: body.doctor, hospital: req.hospitalFilter!.hospital, isActive: { $ne: false } });
  if (!doctor) {
    throw new AppError("The selected doctor is inactive, retired, or does not exist.", 400);
  }

  // Duplicate appointment guard: Patient + Doctor + Date (any status except cancelled/no_show/completed)
  if (body.patient && body.doctor && body.date) {
    const startOfDay = new Date(body.date as unknown as Date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(body.date as unknown as Date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await Appointment.findOne({
      hospital: req.hospitalFilter!.hospital,
      patient: body.patient,
      doctor: body.doctor,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "no_show", "completed"] },
    });

    if (existing) {
      const apptDate = new Date(existing.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      throw new AppError(
        `This patient already has an appointment with Dr. ${doctor.name} on ${apptDate}. Please complete, cancel or reschedule the existing appointment before creating another appointment.`,
        409
      );
    }
  }

  const appointment = await Appointment.create({
    ...body,
    hospital: req.hospitalFilter!.hospital,
    referenceId: generateReferenceId(),
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
