import { Schema, model, InferSchemaType, Types } from "mongoose";

const shiftHandoverSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    currentShift: { type: String, required: true },
    nextShift: { type: String, required: true },
    patientsHandedOverCount: { type: Number, default: 0 },
    patientsHandedOverDetails: { type: String, default: "" },
    pendingMedication: { type: String, default: "" },
    pendingProcedures: { type: String, default: "" },
    criticalPatients: { type: String, default: "" },
    specialInstructions: { type: String, default: "" },
    remarks: { type: String, default: "" },
    nurseSignature: { type: String, required: true },
    loggedBy: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    loggedByName: { type: String, required: true },
    incomingNurse: { type: Schema.Types.ObjectId, ref: "Staff" },
    incomingNurseName: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

shiftHandoverSchema.index({ hospital: 1, timestamp: -1 });

export type ShiftHandover = InferSchemaType<typeof shiftHandoverSchema> & { _id: Types.ObjectId };
export const ShiftHandover = model("ShiftHandover", shiftHandoverSchema);
