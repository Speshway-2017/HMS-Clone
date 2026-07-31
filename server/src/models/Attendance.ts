import { Schema, model, InferSchemaType, Types } from "mongoose";

export const ATTENDANCE_STATUSES = [
  "Present",
  "Absent",
  "Half Day",
  "Weekly Off",
  "Holiday",
  "Paid Leave",
  "Unpaid Leave (LOP)",
] as const;

export const SHIFTS = ["Morning", "Evening", "Night", "General"] as const;

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
    workingHours: { type: Number, default: 8, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0, min: 0 },
    isEarlyExit: { type: Boolean, default: false },
    earlyExitMinutes: { type: Number, default: 0, min: 0 },
    attendanceSource: { type: String, default: "Automatic Login" },
    shiftRef: { type: Schema.Types.ObjectId, ref: "Shift", default: null },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true, default: "Present" },
    leaveRef: { type: Schema.Types.ObjectId, ref: "LeaveRequest", default: null },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    remarks: { type: String, default: "" },

    // ── Manual Correction Fields (Admin-only, append-only history) ──────────
    isManuallyCorrected: { type: Boolean, default: false },
    correctionReason: { type: String, default: "" },   // e.g. "Login Failure"
    correctionNote: { type: String, default: "" },      // Admin free-text note
    correctedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    correctedAt: { type: Date, default: null },
    // Previous-value snapshot (set only on first correction; never overwritten)
    previousStatus: { type: String, default: "" },
    previousCheckIn: { type: String, default: "" },
    previousCheckOut: { type: String, default: "" },
    previousWorkingHours: { type: Number, default: null },
  },
  { timestamps: true }
);

attendanceSchema.index({ hospital: 1, date: 1 });
attendanceSchema.index({ hospital: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ hospital: 1, department: 1, date: 1 });
attendanceSchema.index({ hospital: 1, branch: 1, date: 1 });
attendanceSchema.index({ hospital: 1, isManuallyCorrected: 1, date: 1 });

export type Attendance = InferSchemaType<typeof attendanceSchema> & { _id: Types.ObjectId };
export const Attendance = model("Attendance", attendanceSchema);
