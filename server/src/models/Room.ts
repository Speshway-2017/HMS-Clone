import { Schema, model, InferSchemaType, Types } from "mongoose";

const roomSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    roomNumber: { type: String, required: true },
    roomType: { type: String, enum: ["General", "Semi-Private", "Private", "ICU"], required: true },
    wardName: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

// Composite unique key for room numbers within a hospital
roomSchema.index({ hospital: 1, roomNumber: 1 }, { unique: true });

export type Room = InferSchemaType<typeof roomSchema> & { _id: Types.ObjectId };
export const Room = model("Room", roomSchema);
