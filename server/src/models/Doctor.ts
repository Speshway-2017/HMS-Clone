import { Schema, model, InferSchemaType, Types } from "mongoose";

export const DOCTOR_STATUSES = ["on_duty", "on_leave", "off_duty", "ACTIVE", "INACTIVE", "RETIRED", "TRANSFERRED"] as const;

const doctorSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    specialization: { type: String, default: "" },
    qualification: { type: String, default: "" },
    licenseNo: { type: String, default: "" },
    bio: { type: String, default: "" },
    status: { type: String, enum: DOCTOR_STATUSES, default: "ACTIVE" },
    rating: { type: Number, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export type Doctor = InferSchemaType<typeof doctorSchema> & { _id: Types.ObjectId };
export const Doctor = model("Doctor", doctorSchema);
