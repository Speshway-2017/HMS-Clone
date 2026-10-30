import { Request, Response } from "express";
import { LeaveRequest, LEAVE_TYPES, LEAVE_STATUSES } from "../models/LeaveRequest";
import { Attendance } from "../models/Attendance";
import { Staff } from "../models/Staff";
import { Doctor } from "../models/Doctor";
import { AuditLog } from "../models/AuditLog";
import { AppError } from "../utils/AppError";
import { z } from "zod";
import {
  requiredTrimmedString,
  optionalTrimmedString,
} from "../utils/validators";

const applyLeaveSchema = z.object({
  employeeId: requiredTrimmedString("Employee ID", 1, 50),
  employeeType: optionalTrimmedString("Employee type", 20, "Staff"),
  leaveType: requiredTrimmedString("Leave type", 1, 50),
  fromDate: requiredTrimmedString("From date", 1, 30),
  toDate: requiredTrimmedString("To date", 1, 30),
  totalDays: z.coerce.number().min(1).max(365).optional(),
  reason: optionalTrimmedString("Reason", 500),
});
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { markPayrollNeedsRecalculation } from "./payrollController";

/**
 * Generate dates array between fromDate and toDate (inclusive)
 */
function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDateStr);
  const end = new Date(endDateStr);

  while (curr <= end) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Helper to auto-generate next Leave ID (e.g. LV-2026-0001)
 */
async function generateLeaveId(hospitalId: any): Promise<string> {
  const count = await LeaveRequest.countDocuments({ hospital: hospitalId });
  const year = new Date().getFullYear();
  const sequence = String(count + 1).padStart(4, "0");
  return `LV-${year}-${sequence}`;
}

/**
 * List all leave requests with filters
 */
export const listLeaveRequests = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { page, limit, skip } = getPagination(req, 20);
  const { status, employeeId, leaveType, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { hospital: hospitalId };
  if (status) filter.status = status;
  if (employeeId) filter.employeeId = employeeId;
  if (leaveType) filter.leaveType = leaveType;
  if (search) filter.employeeName = new RegExp(search, "i");

  const [leaves, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate("department", "name")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    LeaveRequest.countDocuments(filter),
  ]);

  res.json({
    status: "success",
    ...paginatedResponse(leaves, total, { page, limit, skip }),
  });
});

/**
 * Apply / Submit a new leave request
 */
export const applyLeave = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const {
    employeeId,
    employeeType,
    leaveType,
    fromDate,
    toDate,
    totalDays,
    reason,
  } = req.body;

  if (!employeeId || !leaveType || !fromDate || !toDate) {
    throw new AppError("Employee ID, leave type, from date, and to date are required.", 400);
  }

  const empType = employeeType === "Doctor" ? "Doctor" : "Staff";
  let empObj: any = null;

  if (empType === "Doctor") {
    empObj = await Doctor.findOne({ _id: employeeId, hospital: hospitalId }) || await Doctor.findOne({ licenseNo: employeeId, hospital: hospitalId });
  } else {
    empObj = await Staff.findOne({ _id: employeeId, hospital: hospitalId }) || await Staff.findOne({ employeeId: employeeId, hospital: hospitalId });
  }

  if (!empObj) {
    throw new AppError("Employee not found.", 404);
  }

  const leaveId = await generateLeaveId(hospitalId);
  const calculatedDays = totalDays || Math.max(1, getDatesInRange(fromDate, toDate).length);

  const newLeave = await LeaveRequest.create({
    hospital: hospitalId,
    leaveId,
    employeeRef: empObj._id,
    employeeType: empType,
    employeeId: empObj.employeeId || empObj.licenseNo || String(empObj._id),
    employeeName: empObj.name,
    department: empObj.department || null,
    leaveType,
    fromDate,
    toDate,
    totalDays: calculatedDays,
    reason: reason || "",
    status: "Pending",
  });

  res.status(201).json({
    status: "success",
    data: { leave: newLeave },
  });
});

/**
 * Approve leave request -> AUTOMATICALLY UPDATE ATTENDANCE RECORDS & PAYROLL STATUS
 */
export const approveLeave = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { id } = req.params;
  const leave = await LeaveRequest.findOne({ _id: id, hospital: hospitalId });

  if (!leave) {
    throw new AppError("Leave request not found.", 404);
  }

  if (leave.status === "Approved") {
    throw new AppError("Leave request is already approved.", 400);
  }

  const oldStatus = leave.status;
  leave.status = "Approved";
  leave.approvedBy = userId || null;
  leave.approvalDate = new Date();
  await leave.save();

  // Determine Attendance status mapping based on Leave Type
  const targetAttendanceStatus =
    leave.leaveType === "Unpaid Leave" ? "Unpaid Leave (LOP)" : "Paid Leave";

  const dateList = getDatesInRange(leave.fromDate, leave.toDate);
  const monthsAffected = new Set<string>();

  // Automatically create or update attendance for each day in range
  for (const dayStr of dateList) {
    monthsAffected.add(dayStr.slice(0, 7));
    await Attendance.findOneAndUpdate(
      {
        hospital: hospitalId,
        employeeId: leave.employeeId,
        date: dayStr,
      },
      {
        hospital: hospitalId,
        department: leave.department || null,
        employeeRef: leave.employeeRef,
        employeeType: leave.employeeType,
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        date: dayStr,
        checkInTime: "-",
        checkOutTime: "-",
        workingHours: 0,
        overtimeHours: 0,
        status: targetAttendanceStatus,
        leaveRef: leave._id,
        markedBy: userId || null,
        remarks: `Approved ${leave.leaveType} (${leave.leaveId})`,
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  // Mark Payroll Needs Recalculation for affected months
  for (const m of monthsAffected) {
    await markPayrollNeedsRecalculation(hospitalId, leave.employeeId, m);
  }

  // Audit log
  await AuditLog.create({
    hospital: hospitalId,
    user: userId || null,
    userEmail: req.user?.email || "system",
    userRole: req.user?.role || "hospital_admin",
    action: "Leave Approved",
    entity: "LeaveRequest",
    entityId: String(leave._id),
    details: {
      leaveId: leave.leaveId,
      employeeId: leave.employeeId,
      employeeName: leave.employeeName,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      oldValue: oldStatus,
      newValue: "Approved",
      attendanceStatusUpdatedTo: targetAttendanceStatus,
    },
  });

  res.json({
    status: "success",
    message: `Leave ${leave.leaveId} approved. Attendance updated automatically to ${targetAttendanceStatus}.`,
    data: { leave },
  });
});

/**
 * Reject leave request
 */
export const rejectLeave = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { id } = req.params;
  const { rejectionReason } = req.body;

  const leave = await LeaveRequest.findOne({ _id: id, hospital: hospitalId });

  if (!leave) {
    throw new AppError("Leave request not found.", 404);
  }

  const oldStatus = leave.status;
  leave.status = "Rejected";
  leave.rejectionReason = rejectionReason || "Rejected by Admin";
  leave.approvedBy = userId || null;
  leave.approvalDate = new Date();
  await leave.save();

  // Audit log
  await AuditLog.create({
    hospital: hospitalId,
    user: userId || null,
    userEmail: req.user?.email || "system",
    userRole: req.user?.role || "hospital_admin",
    action: "Leave Rejected",
    entity: "LeaveRequest",
    entityId: String(leave._id),
    details: {
      leaveId: leave.leaveId,
      employeeId: leave.employeeId,
      employeeName: leave.employeeName,
      oldValue: oldStatus,
      newValue: "Rejected",
      rejectionReason: leave.rejectionReason,
    },
  });

  res.json({
    status: "success",
    data: { leave },
  });
});

/**
 * Cancel leave request
 */
export const cancelLeave = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { id } = req.params;
  const leave = await LeaveRequest.findOne({ _id: id, hospital: hospitalId });

  if (!leave) {
    throw new AppError("Leave request not found.", 404);
  }

  const oldStatus = leave.status;
  leave.status = "Cancelled";
  await leave.save();

  // If was approved, revert attendance records associated with this leave
  if (oldStatus === "Approved") {
    await Attendance.deleteMany({
      hospital: hospitalId,
      employeeId: leave.employeeId,
      leaveRef: leave._id,
    });
  }

  // Audit log
  await AuditLog.create({
    hospital: hospitalId,
    user: userId || null,
    userEmail: req.user?.email || "system",
    userRole: req.user?.role || "hospital_admin",
    action: "Leave Cancelled",
    entity: "LeaveRequest",
    entityId: String(leave._id),
    details: {
      leaveId: leave.leaveId,
      employeeId: leave.employeeId,
      employeeName: leave.employeeName,
      oldValue: oldStatus,
      newValue: "Cancelled",
    },
  });

  res.json({
    status: "success",
    data: { leave },
  });
});
