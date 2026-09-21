import { Schema, model, InferSchemaType, Types } from "mongoose";

export const LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Compensatory Leave",
  "Unpaid Leave",
] as const;

export const LEAVE_STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"] as const;

const leaveRequestSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    leaveId: { type: String, required: true }, // e.g. LV-2026-0001
    employeeRef: { type: Schema.Types.ObjectId, required: true, refPath: "employeeType" },
    employeeType: { type: String, required: true, enum: ["Staff", "Doctor"], default: "Staff" },
    employeeId: { type: String, required: true, trim: true },
    employeeName: { type: String, required: true, trim: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    fromDate: { type: String, required: true }, // YYYY-MM-DD
    toDate: { type: String, required: true }, // YYYY-MM-DD
    totalDays: { type: Number, required: true, min: 0.5 },
    reason: { type: String, default: "" },
    status: { type: String, enum: LEAVE_STATUSES, default: "Pending" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvalDate: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ hospital: 1, status: 1 });
leaveRequestSchema.index({ hospital: 1, employeeId: 1 });

export type LeaveRequest = InferSchemaType<typeof leaveRequestSchema> & { _id: Types.ObjectId };
export const LeaveRequest = model("LeaveRequest", leaveRequestSchema);
