import { Schema, model, InferSchemaType, Types } from "mongoose";

const certificateSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    diagnosis: { type: String, required: true },
    duration: { type: String, required: true }, // e.g. "3 days"
    notes: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type Certificate = InferSchemaType<typeof certificateSchema> & { _id: Types.ObjectId };
export const Certificate = model("Certificate", certificateSchema);
