import { Schema, model, InferSchemaType, Types } from "mongoose";

const roomSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    roomNumber: { type: String, required: true },
    roomName: { type: String, default: "" },
    ward: { type: Schema.Types.ObjectId, ref: "Ward", required: true },
    wardName: { type: String, required: true }, // Keep for compatibility with existing code
    floor: { type: Number, required: true },
    roomType: {
      type: String,
      enum: ["General", "Semi-Private", "Private", "ICU", "NICU", "Emergency"],
      required: true
    },
    acType: {
      type: String,
      enum: ["AC", "Non AC"],
      default: "Non AC"
    },
    capacity: { type: Number, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
  },
  { timestamps: true }
);

// Composite unique key for room numbers within a hospital
roomSchema.index({ hospital: 1, roomNumber: 1 }, { unique: true });

export type Room = InferSchemaType<typeof roomSchema> & { _id: Types.ObjectId };
export const Room = model("Room", roomSchema);
