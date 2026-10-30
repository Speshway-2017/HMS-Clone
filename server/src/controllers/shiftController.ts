import { Request, Response } from "express";
import { Shift } from "../models/Shift";
import { Staff } from "../models/Staff";
import { Doctor } from "../models/Doctor";
import { AuditLog } from "../models/AuditLog";
import { AppError } from "../utils/AppError";
import { z } from "zod";
import {
  requiredTrimmedString,
  optionalTrimmedString,
  numberValidator,
} from "../utils/validators";

const createShiftSchema = z.object({
  name: requiredTrimmedString("Shift name", 2, 50),
  startTime: requiredTrimmedString("Start time", 1, 20),
  endTime: requiredTrimmedString("End time", 1, 20),
  gracePeriodMinutes: numberValidator("Grace period", 0, 120, false, 15),
  halfDayHours: numberValidator("Half day hours", 0, 24, false, 4),
  fullDayHours: numberValidator("Full day hours", 0, 24, false, 8),
  crossesMidnight: z.boolean().optional().default(false),
});
import { catchAsync } from "../utils/catchAsync";
import { emitToHospital } from "../config/socket";

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

  const { name, startTime, endTime, gracePeriodMinutes, halfDayHours, fullDayHours, crossesMidnight } = req.body;

  if (!name || !startTime || !endTime) {
    throw new AppError("Shift name, start time, and end time are required.", 400);
  }

  const newShift = await Shift.create({
    hospital: hospitalId,
    name,
    startTime,
    endTime,
    gracePeriodMinutes: gracePeriodMinutes !== undefined ? Number(gracePeriodMinutes) : 15,
    halfDayHours: halfDayHours !== undefined ? Number(halfDayHours) : 4,
    fullDayHours: fullDayHours !== undefined ? Number(fullDayHours) : 8,
    crossesMidnight: Boolean(crossesMidnight),
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
    details: { name, startTime, endTime },
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
  const updatedShift = await Shift.findOneAndUpdate(
    { _id: id, hospital: hospitalId },
    req.body,
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
