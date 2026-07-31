import { Request, Response } from "express";
import { Attendance, ATTENDANCE_STATUSES, SHIFTS } from "../models/Attendance";
import { Staff } from "../models/Staff";
import { Doctor } from "../models/Doctor";
import { AuditLog } from "../models/AuditLog";
import { PayrollRecord } from "../models/PayrollRecord";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { markPayrollNeedsRecalculation } from "./payrollController";

// ─── Valid manual-correction reasons ────────────────────────────────────────
export const CORRECTION_REASONS = [
  "Login Failure",
  "Internet Issue",
  "Browser Crash",
  "Forgot Logout",
  "System Downtime",
  "Emergency Duty",
  "Night Shift Issue",
  "Server Issue",
  "Attendance Synchronization Failure",
  "Approved by Management",
  "Other",
] as const;

/**
 * Get daily attendance list with filters
 */
export const getDailyAttendance = catchAsync(async (req: Request, res: Response) => {
  const { date, department, branch, shift, status, search } = req.query as Record<string, string | undefined>;
  const hospitalId = req.hospitalFilter?.hospital;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const queryDate = date || new Date().toISOString().split("T")[0];

  const filter: Record<string, unknown> = { hospital: hospitalId, date: queryDate };
  if (department) filter.department = department;
  if (branch) filter.branch = branch;
  if (shift) filter.shift = shift;
  if (status) filter.status = status;
  if (search) filter.employeeName = new RegExp(search, "i");

  const records = await Attendance.find(filter)
    .populate("department", "name")
    .populate("branch", "name")
    .populate("correctedBy", "name email")
    .sort({ employeeName: 1 });

  res.json({
    status: "success",
    data: {
      date: queryDate,
      total: records.length,
      records,
    },
  });
});

/**
 * Helper to calculate working hours from checkIn, checkOut, and breakMinutes
 */
function calculateWorkingHours(checkIn?: string, checkOut?: string, breakMins: number = 0): number {
  if (!checkIn || !checkOut || checkIn === "-" || checkOut === "-") return 0;

  const parseTime = (t: string): number => {
    const cleaned = t.trim();
    // Check 12-hour format e.g. "09:00 AM"
    const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const p = match12[3].toUpperCase();
      if (p === "PM" && h !== 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
      return h * 60 + m;
    }
    // Check 24-hour format e.g. "09:00"
    const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const h = parseInt(match24[1], 10);
      const m = parseInt(match24[2], 10);
      return h * 60 + m;
    }
    return -1;
  };

  const inMins = parseTime(checkIn);
  const outMins = parseTime(checkOut);

  if (inMins === -1 || outMins === -1) return 0;
  let diff = outMins - inMins;
  if (diff < 0) {
    // Over-night shift adjustment (e.g. 10:00 PM to 06:00 AM)
    diff += 24 * 60;
  }

  const netMins = Math.max(0, diff - Math.max(0, breakMins));
  return Number((netMins / 60).toFixed(2));
}

/**
 * Mark or update attendance for a single employee
 */
export const markSingleAttendance = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;
  const userName = req.user?.name || "Admin";

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const {
    employeeId,
    employeeType,
    date,
    shift,
    checkInTime,
    checkOutTime,
    breakMinutes,
    workingHours,
    overtimeHours,
    overtimeMinutes,
    overtimeReason,
    status,
    isLate,
    isEarlyExit,
    remarks,
    reason,
  } = req.body;

  if (!employeeId || !date || !status) {
    throw new AppError("Employee ID, date, and status are required.", 400);
  }

  if (!ATTENDANCE_STATUSES.includes(status as any)) {
    throw new AppError(`Invalid attendance status: ${status}`, 400);
  }

  const empType = employeeType === "Doctor" ? "Doctor" : "Staff";
  let empObj: any = null;

  if (empType === "Doctor") {
    empObj = await Doctor.findOne({ _id: employeeId, hospital: hospitalId }) || await Doctor.findOne({ licenseNo: employeeId, hospital: hospitalId });
    if (empObj && (empObj.doctorType === "Visiting" || empObj.doctorType === "On-Call")) {
      throw new AppError("Visiting Consultants and On-Call Doctors must NOT appear in Staff Attendance.", 400);
    }
  } else {
    empObj = await Staff.findOne({ _id: employeeId, hospital: hospitalId }) || await Staff.findOne({ employeeId: employeeId, hospital: hospitalId });
  }

  if (!empObj) {
    throw new AppError("Employee not found.", 404);
  }

  const empIdStr = empObj.employeeId || empObj.licenseNo || String(empObj._id);

  const existingRecord = await Attendance.findOne({
    hospital: hospitalId,
    employeeId: empIdStr,
    date,
  });

  const breakMins = Number(breakMinutes || 0);
  const calculatedWorkingHours = (checkInTime && checkOutTime && checkInTime !== "-" && checkOutTime !== "-")
    ? calculateWorkingHours(checkInTime, checkOutTime, breakMins)
    : (workingHours !== undefined ? Number(workingHours) : status === "Present" ? 8 : status === "Half Day" ? 4 : 0);

  if (calculatedWorkingHours < 0) {
    throw new AppError("Working Hours cannot be negative.", 400);
  }

  const otHours = Number(overtimeHours || 0);
  const otMins = Number(overtimeMinutes || 0);

  const previousValues = existingRecord ? {
    status: existingRecord.status,
    shift: existingRecord.shift,
    checkInTime: existingRecord.checkInTime,
    checkOutTime: existingRecord.checkOutTime,
    breakMinutes: existingRecord.breakMinutes,
    workingHours: existingRecord.workingHours,
    overtimeHours: existingRecord.overtimeHours,
    overtimeMinutes: existingRecord.overtimeMinutes,
    overtimeReason: existingRecord.overtimeReason,
    remarks: existingRecord.remarks,
  } : {};

  const newValues = {
    status,
    shift: shift || empObj.shift || "General",
    checkInTime: checkInTime || (status === "Present" ? "09:00 AM" : ""),
    checkOutTime: checkOutTime || (status === "Present" ? "05:00 PM" : ""),
    breakMinutes: breakMins,
    workingHours: calculatedWorkingHours,
    overtimeHours: otHours,
    overtimeMinutes: otMins,
    overtimeReason: overtimeReason || "",
    remarks: remarks || "",
  };

  const auditEntry = {
    updatedBy: userId || null,
    updatedByName: userName,
    timestamp: new Date(),
    previousValues,
    newValues,
    reason: reason || (existingRecord ? "Manual Attendance Edit" : "Manual Attendance Creation"),
  };

  const payload = {
    hospital: hospitalId,
    branch: empObj.branch || null,
    department: empObj.department || null,
    employeeRef: empObj._id,
    employeeType: empType,
    employeeId: empIdStr,
    employeeName: empObj.name,
    designation: empObj.role || empObj.specialization || "Employee",
    shift: newValues.shift,
    date,
    checkInTime: newValues.checkInTime,
    checkOutTime: newValues.checkOutTime,
    breakMinutes: newValues.breakMinutes,
    workingHours: newValues.workingHours,
    overtimeHours: newValues.overtimeHours,
    overtimeMinutes: newValues.overtimeMinutes,
    overtimeReason: newValues.overtimeReason,
    isLate: Boolean(isLate),
    isEarlyExit: Boolean(isEarlyExit),
    status,
    attendanceSource: "Manual Admin Entry",
    markedBy: userId || null,
    remarks: newValues.remarks,
  };

  let updatedRecord;
  if (existingRecord) {
    existingRecord.set(payload);
    existingRecord.auditHistory.push(auditEntry as any);
    updatedRecord = await existingRecord.save();
  } else {
    updatedRecord = await Attendance.create({
      ...payload,
      auditHistory: [auditEntry],
    });
  }

  // Mark Payroll Needs Recalculation
  await markPayrollNeedsRecalculation(hospitalId, payload.employeeId, date.slice(0, 7));

  // Record System Audit Log
  await AuditLog.create({
    hospital: hospitalId,
    user: userId || null,
    userEmail: req.user?.email || "admin",
    userRole: req.user?.role || "hospital_admin",
    action: existingRecord ? "Attendance Updated" : "Attendance Marked",
    entity: "Attendance",
    entityId: String(updatedRecord._id),
    details: {
      employeeId: payload.employeeId,
      employeeName: payload.employeeName,
      date,
      previousStatus: previousValues.status || "None",
      newStatus: status,
      reason: auditEntry.reason,
    },
  });

  res.json({
    status: "success",
    data: { attendance: updatedRecord },
  });
});

/**
 * Bulk mark attendance for multiple employees for a specific date
 */
export const bulkMarkAttendance = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;
  const userName = req.user?.name || "Admin";

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { date, records } = req.body;

  if (!date || !Array.isArray(records) || records.length === 0) {
    throw new AppError("Date and an array of employee attendance records are required.", 400);
  }

  const results = [];

  for (const item of records) {
    const empType = item.employeeType === "Doctor" ? "Doctor" : "Staff";
    let empObj: any = null;

    if (empType === "Doctor") {
      empObj = await Doctor.findOne({ _id: item.employeeId, hospital: hospitalId }) || await Doctor.findOne({ licenseNo: item.employeeId, hospital: hospitalId });
      if (empObj && (empObj.doctorType === "Visiting" || empObj.doctorType === "On-Call")) continue;
    } else {
      empObj = await Staff.findOne({ _id: item.employeeId, hospital: hospitalId }) || await Staff.findOne({ employeeId: item.employeeId, hospital: hospitalId });
    }

    if (!empObj) continue;

    const empIdStr = empObj.employeeId || empObj.licenseNo || String(empObj._id);

    const existingRecord = await Attendance.findOne({
      hospital: hospitalId,
      employeeId: empIdStr,
      date,
    });

    const breakMins = Number(item.breakMinutes || 0);
    const calculatedWorkingHours = (item.checkInTime && item.checkOutTime && item.checkInTime !== "-" && item.checkOutTime !== "-")
      ? calculateWorkingHours(item.checkInTime, item.checkOutTime, breakMins)
      : (item.workingHours !== undefined ? Number(item.workingHours) : item.status === "Present" ? 8 : item.status === "Half Day" ? 4 : 0);

    const otHours = Number(item.overtimeHours || 0);
    const otMins = Number(item.overtimeMinutes || 0);

    const newValues = {
      status: item.status || "Present",
      shift: item.shift || empObj.shift || "General",
      checkInTime: item.checkInTime || (item.status === "Present" ? "09:00 AM" : ""),
      checkOutTime: item.checkOutTime || (item.status === "Present" ? "05:00 PM" : ""),
      breakMinutes: breakMins,
      workingHours: calculatedWorkingHours,
      overtimeHours: otHours,
      overtimeMinutes: otMins,
      overtimeReason: item.overtimeReason || "",
      remarks: item.remarks || "",
    };

    const auditEntry = {
      updatedBy: userId || null,
      updatedByName: userName,
      timestamp: new Date(),
      previousValues: existingRecord ? { status: existingRecord.status, checkInTime: existingRecord.checkInTime, checkOutTime: existingRecord.checkOutTime } : {},
      newValues,
      reason: "Bulk Attendance Marking",
    };

    const payload = {
      hospital: hospitalId,
      branch: empObj.branch || null,
      department: empObj.department || null,
      employeeRef: empObj._id,
      employeeType: empType,
      employeeId: empIdStr,
      employeeName: empObj.name,
      designation: empObj.role || empObj.specialization || "Employee",
      shift: newValues.shift,
      date,
      checkInTime: newValues.checkInTime,
      checkOutTime: newValues.checkOutTime,
      breakMinutes: newValues.breakMinutes,
      workingHours: newValues.workingHours,
      overtimeHours: newValues.overtimeHours,
      overtimeMinutes: newValues.overtimeMinutes,
      overtimeReason: newValues.overtimeReason,
      isLate: Boolean(item.isLate),
      isEarlyExit: Boolean(item.isEarlyExit),
      status: newValues.status,
      attendanceSource: "Manual Admin Entry",
      markedBy: userId || null,
      remarks: newValues.remarks,
    };

    let doc;
    if (existingRecord) {
      existingRecord.set(payload);
      existingRecord.auditHistory.push(auditEntry as any);
      doc = await existingRecord.save();
    } else {
      doc = await Attendance.create({
        ...payload,
        auditHistory: [auditEntry],
      });
    }

    results.push(doc);
    await markPayrollNeedsRecalculation(hospitalId, payload.employeeId, date.slice(0, 7));
  }

  // Audit log
  await AuditLog.create({
    hospital: hospitalId,
    user: userId || null,
    userEmail: req.user?.email || "system",
    userRole: req.user?.role || "hospital_admin",
    action: "Bulk Attendance Marked",
    entity: "Attendance",
    details: {
      date,
      count: results.length,
    },
  });

  res.json({
    status: "success",
    data: { count: results.length, records: results },
  });
});

/**
 * Get monthly attendance view and statistics for all employees
 */
export const getMonthlyAttendanceSummary = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { month, department, branch, employeeId } = req.query as Record<string, string | undefined>;
  
  // month format: YYYY-MM (e.g. 2026-07)
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const monthRegex = new RegExp(`^${targetMonth}`);

  const filter: Record<string, unknown> = { hospital: hospitalId, date: monthRegex };
  if (department) filter.department = department;
  if (branch) filter.branch = branch;
  if (employeeId) filter.employeeId = employeeId;

  // Aggregate monthly counts per employee
  const aggregations = await Attendance.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$employeeId",
        employeeName: { $first: "$employeeName" },
        designation: { $first: "$designation" },
        department: { $first: "$department" },
        presentDays: {
          $sum: { $cond: [{ $in: ["$status", ["Present", "Training", "Official Duty"]] }, 1, 0] },
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
        },
        halfDays: {
          $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] },
        },
        paidLeaveDays: {
          $sum: { $cond: [{ $in: ["$status", ["Paid Leave", "Sick Leave", "Casual Leave", "Earned Leave", "Maternity Leave", "Paternity Leave", "Emergency Leave"]] }, 1, 0] },
        },
        unpaidLeaveDays: {
          $sum: { $cond: [{ $in: ["$status", ["Unpaid Leave (LOP)", "Absent"]] }, 1, 0] },
        },
        weeklyOffs: {
          $sum: { $cond: [{ $eq: ["$status", "Weekly Off"] }, 1, 0] },
        },
        holidays: {
          $sum: { $cond: [{ $eq: ["$status", "Holiday"] }, 1, 0] },
        },
        overtimeHours: {
          $sum: { $add: [{ $ifNull: ["$overtimeHours", 0] }, { $divide: [{ $ifNull: ["$overtimeMinutes", 0] }, 60] }] },
        },
        lateArrivals: {
          $sum: { $cond: ["$isLate", 1, 0] },
        },
        earlyExits: {
          $sum: { $cond: ["$isEarlyExit", 1, 0] },
        },
        totalRecords: { $sum: 1 },
      },
    },
  ]);

  // Standard working days calculation for the month (e.g., 26 days standard in Indian hospitals)
  const daysInMonth = new Date(
    parseInt(targetMonth.split("-")[0]),
    parseInt(targetMonth.split("-")[1]),
    0
  ).getDate();
  const standardWorkingDays = 26;

  const summaries = aggregations.map((agg) => {
    const totalEffectivePresent = agg.presentDays + agg.paidLeaveDays + (0.5 * agg.halfDays);
    const attendancePercentage = Number(((totalEffectivePresent / standardWorkingDays) * 100).toFixed(1));
    return {
      employeeId: agg._id,
      employeeName: agg.employeeName,
      designation: agg.designation,
      month: targetMonth,
      workingDays: standardWorkingDays,
      presentDays: agg.presentDays,
      absentDays: agg.absentDays,
      halfDays: agg.halfDays,
      paidLeaveDays: agg.paidLeaveDays,
      unpaidLeaveDays: agg.unpaidLeaveDays,
      weeklyOffs: agg.weeklyOffs,
      holidays: agg.holidays,
      overtimeHours: agg.overtimeHours,
      lateArrivals: agg.lateArrivals,
      earlyExits: agg.earlyExits,
      attendancePercentage: Math.min(attendancePercentage, 100),
    };
  });

  res.json({
    status: "success",
    data: {
      month: targetMonth,
      daysInMonth,
      standardWorkingDays,
      summaries,
    },
  });
});

/**
 * Get attendance history with filters
 */
export const getAttendanceHistory = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { page, limit, skip } = getPagination(req, 30);
  const { employeeId, fromDate, toDate, department, branch, shift, status } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { hospital: hospitalId };
  if (employeeId) filter.employeeId = employeeId;
  if (department) filter.department = department;
  if (branch) filter.branch = branch;
  if (shift) filter.shift = shift;
  if (status) filter.status = status;

  if (fromDate || toDate) {
    const dateQuery: Record<string, string> = {};
    if (fromDate) dateQuery.$gte = fromDate;
    if (toDate) dateQuery.$lte = toDate;
    filter.date = dateQuery;
  }

  const [history, total] = await Promise.all([
    Attendance.find(filter)
      .populate("department", "name")
      .populate("branch", "name")
      .populate("markedBy", "name email")
      .populate("correctedBy", "name email")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(filter),
  ]);

  res.json({
    status: "success",
    ...paginatedResponse(history, total, { page, limit, skip }),
  });
});

/**
 * Manually correct an existing attendance record (Admin only)
 *
 * Priority: Approved Leave > Manual Correction > Automatic Attendance
 * - Cannot override an approved leave (leaveRef must be null)
 * - Snapshots previous values on first correction (never overwrites snapshot)
 * - Creates an immutable AuditLog entry
 * - Marks PayrollRecord for the affected month as "Calculated" to force recalculation
 */
export const correctAttendance = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const adminUser = req.user;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { id } = req.params;

  const {
    status,
    checkInTime,
    checkOutTime,
    workingHours,
    overtimeHours,
    isLate,
    isEarlyExit,
    correctionReason,
    correctionNote,
  } = req.body;

  // ── Mandatory reason validation ────────────────────────────────────────────
  if (!correctionReason || String(correctionReason).trim() === "") {
    throw new AppError("A correction reason is mandatory for manual attendance correction.", 400);
  }

  if (!CORRECTION_REASONS.includes(correctionReason as any)) {
    throw new AppError(
      `Invalid correction reason. Must be one of: ${CORRECTION_REASONS.join(", ")}`,
      400
    );
  }

  // ── Fetch the existing record ──────────────────────────────────────────────
  const record = await Attendance.findOne({ _id: id, hospital: hospitalId });

  if (!record) {
    throw new AppError("Attendance record not found.", 404);
  }

  // ── Approved leave cannot be overridden ───────────────────────────────────
  if (record.leaveRef) {
    throw new AppError(
      "This attendance is linked to an approved leave request. Leave always takes priority and cannot be manually overridden.",
      400
    );
  }

  // ── Validate new status ────────────────────────────────────────────────────
  if (status && !ATTENDANCE_STATUSES.includes(status as any)) {
    throw new AppError(`Invalid attendance status: ${status}`, 400);
  }

  const newStatus = status || record.status;
  const newCheckIn = checkInTime !== undefined ? String(checkInTime) : record.checkInTime;
  const newCheckOut = checkOutTime !== undefined ? String(checkOutTime) : record.checkOutTime;
  const newWorkingHours = workingHours !== undefined ? Number(workingHours) : record.workingHours;
  const newOvertimeHours = overtimeHours !== undefined ? Number(overtimeHours) : record.overtimeHours;
  const newIsLate = isLate !== undefined ? Boolean(isLate) : record.isLate;
  const newIsEarlyExit = isEarlyExit !== undefined ? Boolean(isEarlyExit) : record.isEarlyExit;

  // ── Business rule validations ──────────────────────────────────────────────

  // Present without check-in
  if (newStatus === "Present" && !newCheckIn) {
    throw new AppError("Check-in time is required when status is Present.", 400);
  }

  // Negative working hours
  if (newWorkingHours < 0) {
    throw new AppError("Working hours cannot be negative.", 400);
  }

  // Negative overtime
  if (newOvertimeHours < 0) {
    throw new AppError("Overtime hours cannot be negative.", 400);
  }

  // Check-out before check-in (simple string comparison works for HH:MM AM/PM format)
  if (newCheckIn && newCheckOut) {
    const parseTime = (t: string): number => {
      // Parse "HH:MM AM/PM" → minutes since midnight
      const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return -1;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const inMins = parseTime(newCheckIn);
    const outMins = parseTime(newCheckOut);
    // Allow night-shift wrap-around (outMins < inMins)
    if (inMins !== -1 && outMins !== -1 && outMins < inMins) {
      // This could be a night shift — only reject if same-day and difference is suspicious
      const diff = outMins - inMins;
      if (diff < -720) {
        // More than 12 hours wrap makes no sense
        throw new AppError(
          "Check-out time cannot be more than 12 hours before check-in on the same day.",
          400
        );
      }
    }
  }

  // Half Day working hours cannot exceed 4 hours
  if (newStatus === "Half Day" && newWorkingHours > 4) {
    throw new AppError("Half Day working hours cannot exceed 4 hours.", 400);
  }

  // Overtime without attendance
  if (
    newOvertimeHours > 0 &&
    newStatus !== "Present" &&
    newStatus !== "Half Day"
  ) {
    throw new AppError(
      "Overtime hours can only be recorded for Present or Half Day attendance.",
      400
    );
  }

  // ── Snapshot previous values (only on first correction) ───────────────────
  const isFirstCorrection = !record.isManuallyCorrected;
  const snapshotUpdate: Record<string, any> = {};
  if (isFirstCorrection) {
    snapshotUpdate.previousStatus = record.status;
    snapshotUpdate.previousCheckIn = record.checkInTime;
    snapshotUpdate.previousCheckOut = record.checkOutTime;
    snapshotUpdate.previousWorkingHours = record.workingHours;
  }

  // ── Apply the correction ───────────────────────────────────────────────────
  const correctedRecord = await Attendance.findByIdAndUpdate(
    id,
    {
      $set: {
        status: newStatus,
        checkInTime: newCheckIn,
        checkOutTime: newCheckOut,
        workingHours: newWorkingHours,
        overtimeHours: newOvertimeHours,
        isLate: newIsLate,
        isEarlyExit: newIsEarlyExit,
        attendanceSource: "Manual Correction",
        isManuallyCorrected: true,
        correctionReason,
        correctionNote: correctionNote || "",
        correctedBy: adminUser?._id || null,
        correctedAt: new Date(),
        ...snapshotUpdate,
      },
    },
    { new: true, runValidators: true }
  ).populate("correctedBy", "name email");

  if (!correctedRecord) {
    throw new AppError("Failed to apply correction.", 500);
  }

  // ── Immutable Audit Log ────────────────────────────────────────────────────
  await AuditLog.create({
    hospital: hospitalId,
    user: adminUser?._id || null,
    userEmail: adminUser?.email || "admin",
    userRole: adminUser?.role || "hospital_admin",
    action: "Attendance Manual Correction",
    entity: "Attendance",
    entityId: String(correctedRecord._id),
    details: {
      employeeId: correctedRecord.employeeId,
      employeeName: correctedRecord.employeeName,
      attendanceDate: correctedRecord.date,
      isFirstCorrection,
      oldStatus: isFirstCorrection ? record.status : correctedRecord.previousStatus,
      newStatus: correctedRecord.status,
      oldCheckIn: isFirstCorrection ? record.checkInTime : correctedRecord.previousCheckIn,
      newCheckIn: correctedRecord.checkInTime,
      oldCheckOut: isFirstCorrection ? record.checkOutTime : correctedRecord.previousCheckOut,
      newCheckOut: correctedRecord.checkOutTime,
      oldWorkingHours: isFirstCorrection ? record.workingHours : correctedRecord.previousWorkingHours,
      newWorkingHours: correctedRecord.workingHours,
      correctionReason,
      correctionNote: correctionNote || "",
      correctedBy: adminUser?.email || "admin",
      correctedAt: correctedRecord.correctedAt,
    },
    ipAddress: req.ip || "",
    userAgent: req.headers["user-agent"] || "",
  });

  // ── Payroll Recalculation: set status to Needs Recalculation ────────
  const attendanceMonth = correctedRecord.date.slice(0, 7); // "YYYY-MM"
  await markPayrollNeedsRecalculation(hospitalId, correctedRecord.employeeId, attendanceMonth);

  res.json({
    status: "success",
    message: "Attendance manually corrected successfully. Payroll will auto-recalculate.",
    data: { attendance: correctedRecord },
  });
});

/**
 * Get valid correction reasons (for client dropdown)
 */
export const getCorrectionReasons = catchAsync(async (_req: Request, res: Response) => {
  res.json({
    status: "success",
    data: { reasons: CORRECTION_REASONS },
  });
});
