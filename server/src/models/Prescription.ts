import { Schema, model, InferSchemaType, Types } from "mongoose";

const prescriptionSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    diagnosis: { type: String, required: true },
    medicines: [
      {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
      },
    ],
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    notes: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type Prescription = InferSchemaType<typeof prescriptionSchema> & { _id: Types.ObjectId };
export const Prescription = model("Prescription", prescriptionSchema);
