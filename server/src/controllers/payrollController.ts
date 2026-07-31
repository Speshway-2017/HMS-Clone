import { Request, Response } from "express";
import mongoose from "mongoose";
import { PayrollRecord } from "../models/PayrollRecord";
import { Attendance } from "../models/Attendance";
import { Staff } from "../models/Staff";
import { Doctor } from "../models/Doctor";
import { AuditLog } from "../models/AuditLog";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

async function findEmployeeByAnyIdentifier(
  hospitalId: any,
  identifier: string,
  employeeRef?: string,
  employeeType?: string
) {
  if (!identifier && !employeeRef) return null;

  const idsToTry = [identifier, employeeRef].filter(Boolean) as string[];
  let empObj: any = null;

  for (const id of idsToTry) {
    const isObjId = mongoose.Types.ObjectId.isValid(id);

    if (employeeType === "Doctor" || !empObj) {
      if (isObjId) {
        empObj = await Doctor.findOne({ _id: id, hospital: hospitalId });
      }
      if (!empObj) {
        empObj = await Doctor.findOne({
          hospital: hospitalId,
          $or: [{ licenseNo: id }, { employeeId: id }],
        });
      }
    }

    if (!empObj) {
      if (isObjId) {
        empObj = await Staff.findOne({ _id: id, hospital: hospitalId });
      }
      if (!empObj) {
        empObj = await Staff.findOne({
          hospital: hospitalId,
          $or: [{ employeeId: id }, { code: id }],
        });
      }
    }

    if (empObj) break;
  }

  return empObj;
}

/**
 * Helper to mark payroll status as 'Needs Recalculation' whenever attendance/leave changes
 */
export async function markPayrollNeedsRecalculation(hospitalId: any, employeeId: string, month: string) {
  try {
    await PayrollRecord.updateMany(
      {
        hospital: hospitalId,
        employeeId,
        month,
        status: { $nin: ["Locked", "Disbursed", "Paid"] },
      },
      {
        $set: { status: "Needs Recalculation", lastSyncTimestamp: new Date() },
      }
    );
  } catch (err) {
    console.error("Error marking payroll needs recalculation:", err);
  }
}

/**
 * Enterprise Indian Hospital Payroll Calculation Engine
 */
export function calculateIndianHospitalPayroll(params: {
  basicSalary: number;
  allowances: number;
  specialAllowance?: number;
  bonus?: number;
  incentives?: number;
  overtimeHours: number;
  workingDays?: number;
  presentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  weeklyOffs: number;
  holidays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  pfEligible?: boolean;
  esiEligible?: boolean;
  professionalTax?: number;
  recovery?: number;
  otherDeductions?: number;
}) {
  const standardWorkingDays = params.workingDays || 26;
  const presentDays = Math.max(0, params.presentDays);
  const halfDays = Math.max(0, params.halfDays);
  const paidLeaveDays = Math.max(0, params.paidLeaveDays);
  const weeklyOffs = Math.max(0, params.weeklyOffs);
  const holidays = Math.max(0, params.holidays);
  const overtimeHours = Math.max(0, params.overtimeHours);

  // Effective present calculation: Present (1) + Paid Leave (1) + Holiday (1) + Weekly Off (1) + Half Day (0.5)
  const effectivePresentDays = presentDays + paidLeaveDays + weeklyOffs + holidays + 0.5 * halfDays;

  // LOP Days calculation
  const calculatedLopDays = Math.max(0, standardWorkingDays - effectivePresentDays);
  const lopDays = Math.max(params.unpaidLeaveDays || 0, calculatedLopDays);

  const basicSalary = Math.max(0, params.basicSalary);
  const allowances = Math.max(0, params.allowances);
  const specialAllowance = Math.max(0, params.specialAllowance || 0);
  const bonus = Math.max(0, params.bonus || 0);
  const incentives = Math.max(0, params.incentives || 0);

  // Per Day Salary = (Basic + Allowances) / Working Days
  const monthlyBase = basicSalary + allowances;
  const perDaySalary = Number((monthlyBase / standardWorkingDays).toFixed(2));

  // LOP Deduction = Per Day Salary * LOP Days
  const lopDeduction = Math.round(perDaySalary * lopDays);

  // Overtime calculation: Hourly Rate = Monthly Salary / (Working Days * 8)
  const shiftHours = 8;
  const hourlyRate = Number((monthlyBase / (standardWorkingDays * shiftHours)).toFixed(2));
  const otMultiplier = 1.5;
  const overtimePayment = Math.round(hourlyRate * overtimeHours * otMultiplier);

  // Gross Salary = Basic + Allowances + Special Allowance + Bonus + Incentives + OT Payment
  const grossSalary = Math.round(basicSalary + allowances + specialAllowance + bonus + incentives + overtimePayment);

  // Statutory Deductions (Indian Standard)
  // PF = 12% of basic (earned basic)
  const earnedBasic = Math.max(0, basicSalary - (basicSalary / standardWorkingDays) * lopDays);
  const pfDeduction = params.pfEligible !== false ? Math.round(earnedBasic * 0.12) : 0;

  // ESI = 0.75% of Gross Salary if gross < 21000
  const esiDeduction = params.esiEligible && grossSalary < 21000 ? Math.round(grossSalary * 0.0075) : 0;

  // Professional Tax (Standard Rs 200 or override)
  const professionalTax = params.professionalTax !== undefined ? Math.max(0, params.professionalTax) : 200;

  const recovery = Math.max(0, params.recovery || 0);
  const otherDeductions = Math.max(0, params.otherDeductions || 0);

  const totalDeductions = lopDeduction + pfDeduction + esiDeduction + professionalTax + recovery + otherDeductions;
  const netSalary = Math.max(0, Math.round(grossSalary - totalDeductions));

  const attendancePercentage = Number(Math.min(100, (effectivePresentDays / standardWorkingDays) * 100).toFixed(1));

  return {
    workingDays: standardWorkingDays,
    presentDays,
    halfDays,
    paidLeaveDays,
    weeklyOffs,
    holidays,
    absentDays: params.absentDays || 0,
    unpaidLeaveDays: lopDays,
    effectivePresentDays,
    overtimeHours,
    attendancePercentage,

    perDaySalary,
    hourlyRate,

    basicSalary,
    allowances,
    specialAllowance,
    bonus,
    incentives,
    overtimePayment,
    grossSalary,

    pfDeduction,
    esiDeduction,
    professionalTax,
    lopDeduction,
    recovery,
    otherDeductions,
    totalDeductions,

    netSalary,
  };
}

/**
 * Get real-time payroll integration summary for all employees for a given month
 */
export const getPayrollSummary = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { month } = req.query as { month?: string };
  const targetMonth = month || new Date().toISOString().slice(0, 7); // e.g., "2026-07"
  const monthRegex = new RegExp(`^${targetMonth}`);

  const [staffMembers, doctors] = await Promise.all([
    Staff.find({ hospital: hospitalId }),
    Doctor.find({ hospital: hospitalId }),
  ]);

  const allEmployees: Array<{
    _id: any;
    employeeId: string;
    name: string;
    designation: string;
    type: "Staff" | "Doctor";
    department: any;
    basicSalary: number;
    allowances: number;
    incentives: number;
    pfEligible: boolean;
    esiEligible: boolean;
    professionalTax: number;
  }> = [];

  staffMembers.forEach((s: any) => {
    allEmployees.push({
      _id: s._id,
      employeeId: s.employeeId || `STF-${String(s._id).slice(-5).toUpperCase()}`,
      name: s.name,
      designation: s.role || "Staff Member",
      type: "Staff",
      department: s.department,
      basicSalary: s.basicSalary || 45000,
      allowances: s.allowances || 5000,
      incentives: s.incentives || 0,
      pfEligible: s.pfEligible ?? true,
      esiEligible: s.esiEligible ?? false,
      professionalTax: s.professionalTax ?? 200,
    });
  });

  doctors.forEach((d: any) => {
    allEmployees.push({
      _id: d._id,
      employeeId: d.licenseNo || `DOC-${String(d._id).slice(-5).toUpperCase()}`,
      name: d.name,
      designation: d.specialization ? `Doctor (${d.specialization})` : "Doctor",
      type: "Doctor",
      department: d.department,
      basicSalary: d.basicSalary || 120000,
      allowances: d.allowances || 15000,
      incentives: d.incentives || 0,
      pfEligible: d.pfEligible ?? true,
      esiEligible: d.esiEligible ?? false,
      professionalTax: d.professionalTax ?? 200,
    });
  });

  // Saved PayrollRecords for targetMonth
  const existingPayrollRecords = await PayrollRecord.find({
    hospital: hospitalId,
    month: targetMonth,
  });

  const recordMap = new Map<string, any>();
  existingPayrollRecords.forEach((rec) => {
    recordMap.set(rec.employeeId, rec);
  });

  const syncTimestamp = new Date();

  // Process each employee against live Attendance records
  const resultSummaries = await Promise.all(
    allEmployees.map(async (emp) => {
      const attendanceAgg = await Attendance.aggregate([
        {
          $match: {
            hospital: hospitalId,
            employeeId: emp.employeeId,
            date: monthRegex,
          },
        },
        {
          $group: {
            _id: "$employeeId",
            presentDays: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
            absentDays: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
            halfDays: { $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] } },
            paidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Paid Leave"] }, 1, 0] } },
            unpaidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Unpaid Leave (LOP)"] }, 1, 0] } },
            weeklyOffs: { $sum: { $cond: [{ $eq: ["$status", "Weekly Off"] }, 1, 0] } },
            holidays: { $sum: { $cond: [{ $eq: ["$status", "Holiday"] }, 1, 0] } },
            overtimeHours: { $sum: "$overtimeHours" },
          },
        },
      ]);

      const agg = attendanceAgg[0] || {
        presentDays: 0,
        absentDays: 0,
        halfDays: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        weeklyOffs: 0,
        holidays: 0,
        overtimeHours: 0,
      };

      const existingRecord = recordMap.get(emp.employeeId);

      // Preserve Accountant adjustments if existing record present
      const specialAllowance = existingRecord?.specialAllowance ?? 0;
      const bonus = existingRecord?.bonus ?? 0;
      const incentives = existingRecord?.incentives ?? emp.incentives;
      const recovery = existingRecord?.recovery ?? 0;
      const professionalTax = existingRecord?.professionalTax ?? emp.professionalTax;
      const remarks = existingRecord?.remarks ?? "";

      const calc = calculateIndianHospitalPayroll({
        basicSalary: emp.basicSalary,
        allowances: emp.allowances,
        specialAllowance,
        bonus,
        incentives,
        overtimeHours: agg.overtimeHours,
        workingDays: 26,
        presentDays: agg.presentDays,
        halfDays: agg.halfDays,
        paidLeaveDays: agg.paidLeaveDays,
        weeklyOffs: agg.weeklyOffs,
        holidays: agg.holidays,
        absentDays: agg.absentDays,
        unpaidLeaveDays: agg.unpaidLeaveDays,
        pfEligible: emp.pfEligible,
        esiEligible: emp.esiEligible,
        professionalTax,
        recovery,
      });

      const status = existingRecord ? existingRecord.status : "Calculated";

      return {
        employeeRef: emp._id,
        employeeType: emp.type,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        designation: emp.designation,
        department: emp.department,
        month: targetMonth,
        attendanceSummary: {
          workingDays: calc.workingDays,
          presentDays: calc.presentDays,
          absentDays: calc.absentDays,
          halfDays: calc.halfDays,
          paidLeaveDays: calc.paidLeaveDays,
          unpaidLeaveDays: calc.unpaidLeaveDays,
          weeklyOffs: calc.weeklyOffs,
          holidays: calc.holidays,
          effectivePresentDays: calc.effectivePresentDays,
          overtimeHours: calc.overtimeHours,
          attendancePercentage: calc.attendancePercentage,
          attendanceSource: "Synced from Staff Attendance (Read Only)",
          lastSyncTimestamp: syncTimestamp.toISOString(),
        },
        salaryBreakdown: {
          perDaySalary: calc.perDaySalary,
          hourlyRate: calc.hourlyRate,
          basicSalary: calc.basicSalary,
          allowances: calc.allowances,
          specialAllowance: calc.specialAllowance,
          bonus: calc.bonus,
          incentives: calc.incentives,
          overtimePayment: calc.overtimePayment,
          grossSalary: calc.grossSalary,
          pfDeduction: calc.pfDeduction,
          esiDeduction: calc.esiDeduction,
          professionalTax: calc.professionalTax,
          lopDeduction: calc.lopDeduction,
          recovery: calc.recovery,
          otherDeductions: calc.otherDeductions,
          totalDeductions: calc.totalDeductions,
          netSalary: calc.netSalary,
        },
        status,
        remarks,
        paidAt: existingRecord?.paidAt || existingRecord?.disbursedAt || null,
        disbursedAt: existingRecord?.disbursedAt || null,
        lockedAt: existingRecord?.lockedAt || null,
        payrollRecordId: existingRecord ? existingRecord._id : null,
      };
    })
  );

  res.json({
    status: "success",
    data: {
      month: targetMonth,
      syncTimestamp: syncTimestamp.toISOString(),
      employees: resultSummaries,
    },
  });
});

/**
 * Accountant Action: Recalculate Payroll
 */
export const recalculatePayroll = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { month, employeeId } = req.body;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const query: any = { hospital: hospitalId, month: targetMonth };
  if (employeeId) query.employeeId = employeeId;

  // Find saved records that are not Locked or Disbursed
  const records = await PayrollRecord.find({
    ...query,
    status: { $nin: ["Locked", "Disbursed", "Paid"] },
  });

  const monthRegex = new RegExp(`^${targetMonth}`);
  let updatedCount = 0;

  for (const record of records) {
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          hospital: hospitalId,
          employeeId: record.employeeId,
          date: monthRegex,
        },
      },
      {
        $group: {
          _id: "$employeeId",
          presentDays: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          halfDays: { $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] } },
          paidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Paid Leave"] }, 1, 0] } },
          unpaidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Unpaid Leave (LOP)"] }, 1, 0] } },
          weeklyOffs: { $sum: { $cond: [{ $eq: ["$status", "Weekly Off"] }, 1, 0] } },
          holidays: { $sum: { $cond: [{ $eq: ["$status", "Holiday"] }, 1, 0] } },
          overtimeHours: { $sum: "$overtimeHours" },
        },
      },
    ]);

    const agg = attendanceAgg[0] || {
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
      weeklyOffs: 0,
      holidays: 0,
      overtimeHours: 0,
    };

    const calc = calculateIndianHospitalPayroll({
      basicSalary: record.basicSalary || 45000,
      allowances: record.allowances || 5000,
      specialAllowance: record.specialAllowance || 0,
      bonus: record.bonus || 0,
      incentives: record.incentives || 0,
      overtimeHours: agg.overtimeHours,
      workingDays: 26,
      presentDays: agg.presentDays,
      halfDays: agg.halfDays,
      paidLeaveDays: agg.paidLeaveDays,
      weeklyOffs: agg.weeklyOffs,
      holidays: agg.holidays,
      absentDays: agg.absentDays,
      unpaidLeaveDays: agg.unpaidLeaveDays,
      professionalTax: record.professionalTax,
      recovery: record.recovery,
    });

    record.presentDays = calc.presentDays;
    record.absentDays = calc.absentDays;
    record.halfDays = calc.halfDays;
    record.paidLeaveDays = calc.paidLeaveDays;
    record.unpaidLeaveDays = calc.unpaidLeaveDays;
    record.weeklyOffs = calc.weeklyOffs;
    record.holidays = calc.holidays;
    record.effectivePresentDays = calc.effectivePresentDays;
    record.overtimeHours = calc.overtimeHours;
    record.attendancePercentage = calc.attendancePercentage;

    record.perDaySalary = calc.perDaySalary;
    record.hourlyRate = calc.hourlyRate;

    record.overtimePayment = calc.overtimePayment;
    record.grossSalary = calc.grossSalary;
    record.lopDeduction = calc.lopDeduction;
    record.pfDeduction = calc.pfDeduction;
    record.esiDeduction = calc.esiDeduction;
    record.totalDeductions = calc.totalDeductions;
    record.netSalary = calc.netSalary;

    record.status = "Calculated";
    record.lastSyncTimestamp = new Date();
    await record.save();
    updatedCount++;
  }

  res.json({
    status: "success",
    message: `Recalculated payroll for ${updatedCount} employee records for ${targetMonth}.`,
  });
});

/**
 * Accountant Action: Save Manual Adjustments / Draft
 */
export const savePayrollAdjustments = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const {
    employeeId,
    employeeRef,
    employeeType,
    month,
    specialAllowance,
    bonus,
    incentives,
    recovery,
    professionalTax,
    remarks,
    status: reqStatus,
  } = req.body;

  if (!employeeId || !month) {
    throw new AppError("Employee ID and month are required.", 400);
  }

  const empType = employeeType === "Doctor" ? "Doctor" : "Staff";
  const empObj = await findEmployeeByAnyIdentifier(hospitalId, employeeId, employeeRef, empType);

  if (!empObj) {
    throw new AppError(`Employee '${employeeId}' not found in hospital records.`, 404);
  }

  const actualEmpId = empObj.employeeId || empObj.licenseNo || String(empObj._id);

  // Check if existing record is Locked or Disbursed
  const existing = await PayrollRecord.findOne({
    hospital: hospitalId,
    month,
    $or: [{ employeeId: actualEmpId }, { employeeId }, { employeeRef: empObj._id }],
  });

  if (existing && (existing.status === "Locked" || existing.status === "Disbursed" || existing.status === "Paid")) {
    throw new AppError(`Payroll for this employee is ${existing.status} and cannot be modified.`, 400);
  }

  // Live attendance sync to preserve read-only attendance
  const monthRegex = new RegExp(`^${month}`);
  const attendanceAgg = await Attendance.aggregate([
    {
      $match: {
        hospital: hospitalId,
        date: monthRegex,
        $or: [
          { employeeId: actualEmpId },
          { employeeId },
          { employeeId: String(empObj._id) },
        ],
      },
    },
    {
      $group: {
        _id: "$employeeId",
        presentDays: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
        absentDays: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
        halfDays: { $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] } },
        paidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Paid Leave"] }, 1, 0] } },
        unpaidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Unpaid Leave (LOP)"] }, 1, 0] } },
        weeklyOffs: { $sum: { $cond: [{ $eq: ["$status", "Weekly Off"] }, 1, 0] } },
        holidays: { $sum: { $cond: [{ $eq: ["$status", "Holiday"] }, 1, 0] } },
        overtimeHours: { $sum: "$overtimeHours" },
      },
    },
  ]);

  const agg = attendanceAgg[0] || {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    weeklyOffs: 0,
    holidays: 0,
    overtimeHours: 0,
  };

  const basicSalary = empObj.basicSalary || (empType === "Doctor" ? 120000 : 45000);
  const allowances = empObj.allowances || (empType === "Doctor" ? 15000 : 5000);

  const calc = calculateIndianHospitalPayroll({
    basicSalary,
    allowances,
    specialAllowance: Number(specialAllowance) || 0,
    bonus: Number(bonus) || 0,
    incentives: Number(incentives) || 0,
    overtimeHours: agg.overtimeHours,
    workingDays: 26,
    presentDays: agg.presentDays,
    halfDays: agg.halfDays,
    paidLeaveDays: agg.paidLeaveDays,
    weeklyOffs: agg.weeklyOffs,
    holidays: agg.holidays,
    absentDays: agg.absentDays,
    unpaidLeaveDays: agg.unpaidLeaveDays,
    professionalTax: professionalTax !== undefined ? Number(professionalTax) : 200,
    recovery: Number(recovery) || 0,
  });

  const nextStatus = reqStatus === "Draft" ? "Draft" : "Calculated";

  const payload = {
    hospital: hospitalId,
    employeeRef: empObj._id,
    employeeType: empType,
    employeeId: actualEmpId,
    employeeName: empObj.name,
    designation: empObj.role || empObj.specialization || "Employee",
    department: empObj.department || null,
    month,

    workingDays: calc.workingDays,
    presentDays: calc.presentDays,
    absentDays: calc.absentDays,
    halfDays: calc.halfDays,
    paidLeaveDays: calc.paidLeaveDays,
    unpaidLeaveDays: calc.unpaidLeaveDays,
    weeklyOffs: calc.weeklyOffs,
    holidays: calc.holidays,
    effectivePresentDays: calc.effectivePresentDays,
    overtimeHours: calc.overtimeHours,
    attendancePercentage: calc.attendancePercentage,

    perDaySalary: calc.perDaySalary,
    hourlyRate: calc.hourlyRate,

    basicSalary: calc.basicSalary,
    allowances: calc.allowances,
    specialAllowance: calc.specialAllowance,
    bonus: calc.bonus,
    incentives: calc.incentives,
    overtimePayment: calc.overtimePayment,
    grossSalary: calc.grossSalary,

    pfDeduction: calc.pfDeduction,
    esiDeduction: calc.esiDeduction,
    professionalTax: calc.professionalTax,
    lopDeduction: calc.lopDeduction,
    recovery: calc.recovery,
    otherDeductions: calc.otherDeductions,
    totalDeductions: calc.totalDeductions,

    netSalary: calc.netSalary,

    status: nextStatus,
    remarks: remarks || "",
    lastSyncTimestamp: new Date(),
    processedBy: userId || null,
  };

  let record = await PayrollRecord.findOne({
    hospital: hospitalId,
    month,
    $or: [{ employeeId: actualEmpId }, { employeeId }, { employeeRef: empObj._id }],
  });

  if (record) {
    Object.assign(record, payload);
    await record.save();
  } else {
    record = await PayrollRecord.create(payload);
  }

  res.json({
    status: "success",
    message: "Payroll adjustments saved successfully.",
    data: { payrollRecord: record },
  });
});

/**
 * Accountant Action: Lock Payroll
 */
export const lockPayroll = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { month, employeeId } = req.body;
  if (!month) {
    throw new AppError("Month is required to lock payroll.", 400);
  }

  const query: any = { hospital: hospitalId, month };
  if (employeeId) query.employeeId = employeeId;

  const result = await PayrollRecord.updateMany(query, {
    $set: {
      status: "Locked",
      lockedAt: new Date(),
      lockedBy: userId || null,
    },
  });

  await AuditLog.create({
    hospital: hospitalId,
    user: userId || null,
    userEmail: req.user?.email || "system",
    userRole: req.user?.role || "accountant",
    action: "Payroll Locked",
    entity: "PayrollRecord",
    details: { month, count: result.modifiedCount },
  });

  res.json({
    status: "success",
    message: `Locked payroll for ${result.modifiedCount} employee records for ${month}.`,
  });
});

/**
 * Accountant Action: Disburse Salary (Process Payment)
 */
export const disbursePayroll = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  const userId = req.user?._id;

  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { employeeId, employeeRef, employeeType, month, paymentMethod } = req.body;

  if (!employeeId || !month) {
    throw new AppError("Employee ID and month are required for salary disbursement.", 400);
  }

  const empType = employeeType === "Doctor" ? "Doctor" : "Staff";
  const empObj = await findEmployeeByAnyIdentifier(hospitalId, employeeId, employeeRef, empType);

  if (!empObj) {
    throw new AppError("Employee not found.", 404);
  }

  const actualEmpId = empObj.employeeId || empObj.licenseNo || String(empObj._id);

  let record = await PayrollRecord.findOne({
    hospital: hospitalId,
    month,
    $or: [{ employeeId: actualEmpId }, { employeeId }, { employeeRef: empObj._id }],
  });

  if (!record) {
    const monthRegex = new RegExp(`^${month}`);
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          hospital: hospitalId,
          employeeId: actualEmpId,
          date: monthRegex,
        },
      },
      {
        $group: {
          _id: "$employeeId",
          presentDays: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          halfDays: { $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] } },
          paidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Paid Leave"] }, 1, 0] } },
          unpaidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Unpaid Leave (LOP)"] }, 1, 0] } },
          weeklyOffs: { $sum: { $cond: [{ $eq: ["$status", "Weekly Off"] }, 1, 0] } },
          holidays: { $sum: { $cond: [{ $eq: ["$status", "Holiday"] }, 1, 0] } },
          overtimeHours: { $sum: "$overtimeHours" },
        },
      },
    ]);

    const agg = attendanceAgg[0] || {
      presentDays: 0, absentDays: 0, halfDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, weeklyOffs: 0, holidays: 0, overtimeHours: 0,
    };

    const calc = calculateIndianHospitalPayroll({
      basicSalary: empObj.basicSalary || (empType === "Doctor" ? 120000 : 45000),
      allowances: empObj.allowances || (empType === "Doctor" ? 15000 : 5000),
      overtimeHours: agg.overtimeHours,
      workingDays: 26,
      presentDays: agg.presentDays,
      halfDays: agg.halfDays,
      paidLeaveDays: agg.paidLeaveDays,
      weeklyOffs: agg.weeklyOffs,
      holidays: agg.holidays,
      absentDays: agg.absentDays,
      unpaidLeaveDays: agg.unpaidLeaveDays,
    });

    record = new PayrollRecord({
      hospital: hospitalId,
      employeeRef: empObj._id,
      employeeType: empType,
      employeeId: actualEmpId,
      employeeName: empObj.name,
      designation: empObj.role || empObj.specialization || "Employee",
      department: empObj.department || null,
      month,
      ...calc,
    });
  }

  record.status = "Disbursed";
  record.disbursedAt = new Date();
  record.paidAt = new Date();
  record.paymentMethod = paymentMethod || "Bank Transfer";
  record.processedBy = userId || null;
  await record.save();

  await AuditLog.create({
    hospital: hospitalId,
    user: userId || null,
    userEmail: req.user?.email || "system",
    userRole: req.user?.role || "accountant",
    action: "Salary Generated & Paid",
    entity: "PayrollRecord",
    entityId: String(record._id),
    details: {
      employeeId: actualEmpId,
      employeeName: empObj.name,
      month,
      netSalary: record.netSalary,
      grossSalary: record.grossSalary,
      lopDeduction: record.lopDeduction,
      paymentMethod: record.paymentMethod,
    },
  });

  res.json({
    status: "success",
    message: `Salary of ₹${record.netSalary.toLocaleString("en-IN")} disbursed successfully to ${empObj.name}.`,
    data: { payrollRecord: record },
  });
});

export const processPayrollPayment = disbursePayroll;

/**
 * Get detailed payslip for an employee for a specific month
 */
export const getPayslip = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter?.hospital;
  if (!hospitalId) {
    throw new AppError("Hospital context is required.", 400);
  }

  const { employeeId, month } = req.params;

  let record = await PayrollRecord.findOne({
    hospital: hospitalId,
    employeeId,
    month,
  })
    .populate("department", "name")
    .populate("hospital", "name code address phone email");

  if (!record) {
    const empObj: any = (await Staff.findOne({ employeeId, hospital: hospitalId })) || (await Doctor.findOne({ licenseNo: employeeId, hospital: hospitalId }));
    if (!empObj) {
      throw new AppError("Employee not found.", 404);
    }

    const monthRegex = new RegExp(`^${month}`);
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          hospital: hospitalId,
          employeeId: empObj.employeeId || empObj.licenseNo,
          date: monthRegex,
        },
      },
      {
        $group: {
          _id: "$employeeId",
          presentDays: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          halfDays: { $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] } },
          paidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Paid Leave"] }, 1, 0] } },
          unpaidLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Unpaid Leave (LOP)"] }, 1, 0] } },
          weeklyOffs: { $sum: { $cond: [{ $eq: ["$status", "Weekly Off"] }, 1, 0] } },
          holidays: { $sum: { $cond: [{ $eq: ["$status", "Holiday"] }, 1, 0] } },
          overtimeHours: { $sum: "$overtimeHours" },
        },
      },
    ]);

    const agg = attendanceAgg[0] || {
      presentDays: 0, absentDays: 0, halfDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, weeklyOffs: 0, holidays: 0, overtimeHours: 0,
    };

    const calc = calculateIndianHospitalPayroll({
      basicSalary: empObj.basicSalary || 45000,
      allowances: empObj.allowances || 5000,
      overtimeHours: agg.overtimeHours,
      workingDays: 26,
      presentDays: agg.presentDays,
      halfDays: agg.halfDays,
      paidLeaveDays: agg.paidLeaveDays,
      weeklyOffs: agg.weeklyOffs,
      holidays: agg.holidays,
      absentDays: agg.absentDays,
      unpaidLeaveDays: agg.unpaidLeaveDays,
    });

    record = {
      _id: "preview",
      hospital: hospitalId,
      employeeId: empObj.employeeId || empObj.licenseNo,
      employeeName: empObj.name,
      designation: empObj.role || empObj.specialization || "Employee",
      department: empObj.department,
      month,
      status: "Draft",
      ...calc,
    } as any;
  }

  res.json({
    status: "success",
    data: { payslip: record },
  });
});

