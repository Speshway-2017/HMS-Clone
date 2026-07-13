import { Request, Response } from "express";
import { z } from "zod";
import { Appointment, APPOINTMENT_STATUSES } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";

function generateReferenceId(): string {
  return `APT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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
  const { status, doctor, from, to } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { ...req.hospitalFilter };
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;
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
      ...req.hospitalFilter,
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
  const appointment = await Appointment.findOne({ _id: req.params.id, ...req.hospitalFilter })
    .populate("patient")
    .populate("doctor", "name specialization")
    .populate("department", "name");
  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }
  res.json({ status: "success", data: { appointment } });
});

export const updateAppointment = catchAsync(async (req: Request, res: Response) => {
  const body = appointmentSchema.partial().parse(req.body);
  const appointment = await Appointment.findOneAndUpdate({ _id: req.params.id, ...req.hospitalFilter }, body, {
    new: true,
    runValidators: true,
  });
  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }
  res.json({ status: "success", data: { appointment } });
});

export const deleteAppointment = catchAsync(async (req: Request, res: Response) => {
  const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });
  if (!appointment) {
    throw new AppError("Appointment not found.", 404);
  }
  res.status(204).send();
});
