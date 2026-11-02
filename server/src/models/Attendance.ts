import { Schema, model, InferSchemaType, Types } from "mongoose";

export const ATTENDANCE_STATUSES = [
  "Present",
  "Half Day",
  "Absent",
  "Paid Leave",
  "Sick Leave",
  "Casual Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Emergency Leave",
  "Unpaid Leave (LOP)",
  "Holiday",
  "Weekly Off",
  "Training",
  "Official Duty",
] as const;

export const SHIFTS = [
  "Morning",
  "General",
  "Evening",
  "Night",
  "Custom Shift",
  "General Shift",
  "Morning Shift",
  "Evening Shift",
  "Night Shift",
] as const;

const auditHistorySchema = new Schema(
  {
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedByName: { type: String, default: "Admin" },
    timestamp: { type: Date, default: Date.now },
    previousValues: { type: Schema.Types.Mixed, default: {} },
    newValues: { type: Schema.Types.Mixed, default: {} },
    reason: { type: String, default: "Manual Entry / Update" },
  },
  { _id: true }
);

const attendanceSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    employeeRef: { type: Schema.Types.ObjectId, required: true, refPath: "employeeType" },
    employeeType: { type: String, required: true, enum: ["Staff", "Doctor"], default: "Staff" },
    employeeId: { type: String, required: true, trim: true },
    employeeName: { type: String, required: true, trim: true },
    designation: { type: String, default: "" },
    shift: { type: String, enum: SHIFTS, default: "General" },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    checkInTime: { type: String, default: "" },
    checkOutTime: { type: String, default: "" },
    breakMinutes: { type: Number, default: 0, min: 0 },
    workingHours: { type: Number, default: 8, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    overtimeMinutes: { type: Number, default: 0, min: 0 },
    overtimeReason: { type: String, default: "" },
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0, min: 0 },
    isEarlyExit: { type: Boolean, default: false },
    earlyExitMinutes: { type: Number, default: 0, min: 0 },
    attendanceSource: { type: String, default: "Manual Admin Entry" },
    shiftRef: { type: Schema.Types.ObjectId, ref: "Shift", default: null },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true, default: "Present" },
    leaveRef: { type: Schema.Types.ObjectId, ref: "LeaveRequest", default: null },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    remarks: { type: String, default: "" },
    isManuallyCorrected: { type: Boolean, default: false },
    previousStatus: { type: String, default: null },
    previousCheckIn: { type: String, default: null },
    previousCheckOut: { type: String, default: null },
    previousWorkingHours: { type: Number, default: null },
    correctionReason: { type: String, default: "" },
    correctionNote: { type: String, default: "" },
    correctedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    correctedAt: { type: Date, default: null },
    auditHistory: [auditHistorySchema],
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of employee attendance per date within a hospital
attendanceSchema.index({ hospital: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ hospital: 1, date: 1, status: 1 });
attendanceSchema.index({ hospital: 1, date: 1, department: 1 });
attendanceSchema.index({ hospital: 1, date: 1, shift: 1 });

export type Attendance = InferSchemaType<typeof attendanceSchema> & { _id: Types.ObjectId };
export const Attendance = model("Attendance", attendanceSchema);
