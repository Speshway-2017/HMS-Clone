import { Schema, model, InferSchemaType, Types } from "mongoose";

const bedSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    bedNumber: { type: String, required: true },
    isOccupied: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bedSchema.index({ hospital: 1, room: 1, bedNumber: 1 }, { unique: true });

export type Bed = InferSchemaType<typeof bedSchema> & { _id: Types.ObjectId };
export const Bed = model("Bed", bedSchema);
