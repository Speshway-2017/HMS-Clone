import { Schema, model, InferSchemaType, Types } from "mongoose";

const radiologyOrderSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    type: { type: String, enum: ["X-ray", "CT", "MRI", "Ultrasound"], required: true },
    notes: { type: String, default: "" },
    priority: { type: String, enum: ["Routine", "Urgent", "STAT"], default: "Routine" },
    status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
    resultsUrl: { type: String, default: "" },
    findings: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type RadiologyOrder = InferSchemaType<typeof radiologyOrderSchema> & { _id: Types.ObjectId };
export const RadiologyOrder = model("RadiologyOrder", radiologyOrderSchema);
