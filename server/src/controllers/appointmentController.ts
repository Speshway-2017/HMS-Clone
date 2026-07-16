import { Request, Response } from "express";
import { z } from "zod";
import { Appointment, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";

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
  const { status, doctor, from, to } = req.query as Record<string, string | undefined>;

  const filter: Record<string, any> = { ...req.hospitalFilter };
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;

  // Enforce doctor data isolation for appointment listing
  if (req.user!.role === "doctor") {
    const loggedDoctor = await getLoggedDoctor(req);
    filter.doctor = loggedDoctor._id;
  }

  if (from || to) {
    filter.date = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }

  const [appointments, total, todayCount] = await Promise.all([
    Appointment.find(filter)
      .populate("patient", "name")
      .populate("doctor", "name")
      .populate("department", "name")
      .sort({ date: 1, time: 1 })
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

  // 1. Duplicate appointment guard: Patient + Doctor + Date (any status except cancelled/no_show/completed/missed)
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
    hospital: req.hospitalFilter!.hospital,
    doctor: body.doctor,
    date: body.date,
    time: body.time,
    status: { $nin: ["cancelled", "no_show", "completed", "missed"] }
  });
  if (slotClash) {
    throw new AppError("This time slot is already booked for this doctor. Please choose a different slot.", 409);
  }

  const referenceId = await generateReferenceId(req.hospitalFilter!.hospital.toString(), new Date(body.date));

  const appointment = await Appointment.create({
    ...body,
    hospital: req.hospitalFilter!.hospital,
    referenceId,
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
