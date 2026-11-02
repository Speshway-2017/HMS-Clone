import { Request, Response } from "express";
import { Shift } from "../models/Shift";
import { Staff } from "../models/Staff";
import { Doctor } from "../models/Doctor";
import { AuditLog } from "../models/AuditLog";
import { AppError } from "../utils/AppError";
import { z } from "zod";
import { catchAsync } from "../utils/catchAsync";
import { emitToHospital } from "../config/socket";

const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?[APap][Mm])?$/;

const shiftSchema = z.object({
  name: z
    .string({ invalid_type_error: "Shift name must be a string" })
    .trim()
    .min(2, "Shift Name is required and must be at least 2 characters")
    .max(50, "Shift Name cannot exceed 50 characters. Please enter valid data")
    .regex(/^[a-zA-Z0-9\s\.\-/_()]+$/, "Shift Name contains invalid data. Please enter valid data"),
  startTime: z
    .string({ invalid_type_error: "Start time must be a string" })
    .trim()
    .min(1, "Start Time is required. Please enter valid data")
    .max(20, "Start Time cannot exceed 20 characters. Please enter valid data")
    .refine((val) => TIME_REGEX.test(val), {
      message: "Start Time must be a valid time (e.g. 08:00 AM). Please enter valid data",
    }),
  endTime: z
    .string({ invalid_type_error: "End time must be a string" })
    .trim()
    .min(1, "End Time is required. Please enter valid data")
    .max(20, "End Time cannot exceed 20 characters. Please enter valid data")
    .refine((val) => TIME_REGEX.test(val), {
      message: "End Time must be a valid time (e.g. 05:00 PM). Please enter valid data",
    }),
  gracePeriodMinutes: z.coerce
    .number({ invalid_type_error: "Grace Period must be a valid number. Please enter valid data" })
    .min(0, "Grace Period cannot be negative. Please enter valid data")
    .max(120, "Grace Period cannot exceed 120 minutes. Please enter valid data")
    .default(15),
  halfDayHours: z.coerce
    .number({ invalid_type_error: "Half Day must be a valid number. Please enter valid data" })
    .min(0, "Half Day hours cannot be negative. Please enter valid data")
    .max(24, "Half Day hours cannot exceed 24 hours. Please enter valid data")
    .default(4),
  fullDayHours: z.coerce
    .number({ invalid_type_error: "Full Day must be a valid number. Please enter valid data" })
    .min(0, "Full Day hours cannot be negative. Please enter valid data")
    .max(24, "Full Day hours cannot exceed 24 hours. Please enter valid data")
    .default(8),
  crossesMidnight: z.boolean().optional().default(false),
});

/**
 * List all shifts for hospital
 */
export const listShifts = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  // Seed default hospital shifts if none exist yet
  const count = await Shift.countDocuments({ hospital: hospitalId });
  if (count === 0) {
    await Shift.insertMany([
      {
        hospital: hospitalId,
        name: "Morning",
        startTime: "08:00 AM",
        endTime: "04:00 PM",
        gracePeriodMinutes: 15,
        halfDayHours: 4,
        fullDayHours: 8,
        crossesMidnight: false,
      },
      {
        hospital: hospitalId,
        name: "General",
        startTime: "09:00 AM",
        endTime: "06:00 PM",
        gracePeriodMinutes: 15,
        halfDayHours: 4,
        fullDayHours: 8,
        crossesMidnight: false,
      },
      {
        hospital: hospitalId,
        name: "Evening",
        startTime: "02:00 PM",
        endTime: "10:00 PM",
        gracePeriodMinutes: 15,
        halfDayHours: 4,
        fullDayHours: 8,
        crossesMidnight: false,
      },
      {
        hospital: hospitalId,
        name: "Night",
        startTime: "10:00 PM",
        endTime: "06:00 AM",
        gracePeriodMinutes: 15,
        halfDayHours: 4,
        fullDayHours: 8,
        crossesMidnight: true,
      },
    ]);
  }

  const shifts = await Shift.find({ hospital: hospitalId }).sort({ createdAt: 1 });

  res.json({
    status: "success",
    data: { shifts },
  });
});

/**
 * Create new shift master
 */
export const createShift = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const body = shiftSchema.parse(req.body);

  const newShift = await Shift.create({
    hospital: hospitalId,
    ...body,
  });

  // Audit log
  await AuditLog.create({
    hospital: hospitalId,
    user: userId || null,
    userEmail: req.user?.email || "system",
    userRole: req.user?.role || "hospital_admin",
    action: "Shift Created",
    entity: "Shift",
    entityId: String(newShift._id),
    details: { name: body.name, startTime: body.startTime, endTime: body.endTime },
  });

  emitToHospital(hospitalId, "shift:updated", { action: "CREATE", shift: newShift });

  res.status(201).json({
    status: "success",
    data: { shift: newShift },
  });
});

/**
 * Update shift master
 */
export const updateShift = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { id } = req.params;
  const body = shiftSchema.partial().parse(req.body);

  const updatedShift = await Shift.findOneAndUpdate(
    { _id: id, hospital: hospitalId },
    body,
    { new: true, runValidators: true }
  );

  if (!updatedShift) {
    throw new AppError("Shift not found.", 404);
  }

  // Audit log
  await AuditLog.create({
    hospital: hospitalId,
    user: userId || null,
    userEmail: req.user?.email || "system",
    userRole: req.user?.role || "hospital_admin",
    action: "Shift Updated",
    entity: "Shift",
    entityId: String(updatedShift._id),
    details: req.body,
  });

  emitToHospital(hospitalId, "shift:updated", { action: "UPDATE", shift: updatedShift });

  res.json({
    status: "success",
    data: { shift: updatedShift },
  });
});

/**
 * Delete shift master
 */
export const deleteShift = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { id } = req.params;
  const deletedShift = await Shift.findOneAndDelete({ _id: id, hospital: hospitalId });

  if (!deletedShift) {
    throw new AppError("Shift not found.", 404);
  }

  emitToHospital(hospitalId, "shift:updated", { action: "DELETE", shiftId: id });

  res.status(204).send();
});

/**
 * Assign employee to shift
 */
export const assignShift = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { employeeId, employeeType, shiftName } = req.body;
  if (!employeeId || !shiftName) {
    throw new AppError("Employee ID and shift name are required.", 400);
  }

  if (employeeType === "Doctor") {
    await Doctor.findOneAndUpdate({ _id: employeeId, hospital: hospitalId }, { shift: shiftName });
  } else {
    await Staff.findOneAndUpdate({ _id: employeeId, hospital: hospitalId }, { shift: shiftName });
  }

  res.json({
    status: "success",
    message: `Assigned shift ${shiftName} to employee.`,
  });
});
