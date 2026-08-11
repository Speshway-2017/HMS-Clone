import { Schema, model, InferSchemaType, Types } from "mongoose";

const shiftSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    name: { type: String, required: true, trim: true }, // Morning, General, Evening, Night
    startTime: { type: String, required: true, default: "09:00 AM" },
    endTime: { type: String, required: true, default: "05:00 PM" },
    gracePeriodMinutes: { type: Number, default: 15, min: 0 },
    halfDayHours: { type: Number, default: 4, min: 1 },
    fullDayHours: { type: Number, default: 8, min: 1 },
    crossesMidnight: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    assignedEmployeesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

shiftSchema.index({ hospital: 1, name: 1 }, { unique: true });

export type Shift = InferSchemaType<typeof shiftSchema> & { _id: Types.ObjectId };
export const Shift = model("Shift", shiftSchema);
