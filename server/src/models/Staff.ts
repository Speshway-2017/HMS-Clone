import { Schema, model, InferSchemaType, Types } from "mongoose";

export const STAFF_DUTY_STATUSES = ["on_duty", "late", "off_duty", "on_leave"] as const;

const staffSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    role: { type: String, default: "" },
    employeeId: { type: String, default: "" },
    qualifications: { type: String, default: "" },
    dateOfJoining: { type: Date, default: null },
    dutyStatus: { type: String, enum: STAFF_DUTY_STATUSES, default: "on_duty" },
    checkInTime: { type: String, default: "" },
    taskLoad: { type: Number, default: 0, min: 0, max: 100 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    shift: { type: String, default: "General" },
    basicSalary: { type: Number, default: 45000 },
    allowances: { type: Number, default: 5000 },
    incentives: { type: Number, default: 0 },
    pfEligible: { type: Boolean, default: true },
    esiEligible: { type: Boolean, default: false },
    professionalTax: { type: Number, default: 200 },
  },
  { timestamps: true },
);

export type Staff = InferSchemaType<typeof staffSchema> & { _id: Types.ObjectId };
export const Staff = model("Staff", staffSchema);
