import { Schema, model, InferSchemaType, Types } from "mongoose";

export const PAYROLL_STATUSES = [
  "Draft",
  "Calculated",
  "Needs Recalculation",
  "Locked",
  "Disbursed",
  "Paid", // for backward compatibility alias
] as const;

const payrollRecordSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    employeeRef: { type: Schema.Types.ObjectId, required: true, refPath: "employeeType" },
    employeeType: { type: String, required: true, enum: ["Staff", "Doctor"], default: "Staff" },
    employeeId: { type: String, required: true, trim: true },
    employeeName: { type: String, required: true, trim: true },
    designation: { type: String, default: "" },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    month: { type: String, required: true }, // Format: "YYYY-MM" (e.g., "2026-07")
    
    // Attendance Summaries (Synced from Attendance Records - Read-Only for Accountant)
    workingDays: { type: Number, default: 26 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 }, // LOP Days
    weeklyOffs: { type: Number, default: 0 },
    holidays: { type: Number, default: 0 },
    effectivePresentDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 0 },

    // Per Day Rate & Hourly Rate Formula Cache
    perDaySalary: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },

    // Salary Earnings (Calculated + Accountant Manual Adjustments)
    basicSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    incentives: { type: Number, default: 0 },
    overtimePayment: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },

    // Statutory & LOP Deductions (Indian Hospital Rules)
    pfDeduction: { type: Number, default: 0 },
    esiDeduction: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 200 },
    lopDeduction: { type: Number, default: 0 },
    recovery: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },

    // Final Net Salary
    netSalary: { type: Number, default: 0 },

    status: { type: String, enum: PAYROLL_STATUSES, default: "Calculated" },
    remarks: { type: String, default: "" },
    lastSyncTimestamp: { type: Date, default: Date.now },
    paidAt: { type: Date, default: null },
    disbursedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    paymentMethod: { type: String, default: "Bank Transfer" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

payrollRecordSchema.index({ hospital: 1, month: 1, employeeId: 1 }, { unique: true });
payrollRecordSchema.index({ hospital: 1, month: 1, status: 1 });

export type PayrollRecord = InferSchemaType<typeof payrollRecordSchema> & { _id: Types.ObjectId };
export const PayrollRecord = model("PayrollRecord", payrollRecordSchema);

