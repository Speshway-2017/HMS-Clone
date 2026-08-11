import { Schema, model, InferSchemaType, Types } from "mongoose";

const queueSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    tokenNumber: { type: String, required: true },
    type: { type: String, enum: ["regular", "priority", "emergency"], default: "regular" },
    status: { type: String, enum: ["waiting", "called", "completed", "skipped"], default: "waiting" },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    date: { type: Date, default: Date.now },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
  },
  { timestamps: true }
);

export type Queue = InferSchemaType<typeof queueSchema> & { _id: Types.ObjectId };
export const Queue = model("Queue", queueSchema);
