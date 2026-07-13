import { Schema, model, InferSchemaType, Types } from "mongoose";

const opVisitSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    visitDate: { type: Date, default: Date.now },
    appointmentNumber: { type: String, required: true },
    tokenNumber: { type: String, required: true },
    reasonForVisit: { type: String, default: "" },
    clinicalNotes: { type: String, default: "" },
    status: { type: String, enum: ["active", "completed", "referred_ip", "ConvertedToIP"], default: "active" },
    billingStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
  },
  { timestamps: true }
);

export type OPVisit = InferSchemaType<typeof opVisitSchema> & { _id: Types.ObjectId };
export const OPVisit = model("OPVisit", opVisitSchema);
