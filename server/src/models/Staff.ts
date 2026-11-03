import { Schema, model, InferSchemaType, Types } from "mongoose";

export const STAFF_DUTY_STATUSES = ["on_duty", "late", "off_duty", "on_leave"] as const;

const staffSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    gender: { type: String, enum: ["Male", "Female", "Other", "male", "female", "other"], default: "Male", required: true },
    email: { type: String, default: "", maxlength: 100 },
    phone: { type: String, default: "", maxlength: 10 },
    photoUrl: { type: String, default: "", maxlength: 500 },
    role: { type: String, default: "", maxlength: 50 },
    employeeId: { type: String, default: "", maxlength: 50 },
    qualifications: { type: String, default: "", maxlength: 100 },
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
