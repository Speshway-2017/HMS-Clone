import { Schema, model, InferSchemaType, Types } from "mongoose";

const roomTariffSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    ward: { type: String, required: true },
    roomType: { type: String, enum: ["AC", "Non AC"], required: true },
    tariff: { type: Number, required: true, min: 0 },
    nursingTariff: { type: Number, default: 300, min: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    effectiveDate: { type: Date, default: Date.now },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

// Enforce unique combo of hospital + branch + ward + roomType
roomTariffSchema.index({ hospital: 1, branch: 1, ward: 1, roomType: 1 }, { unique: true });

export type RoomTariff = InferSchemaType<typeof roomTariffSchema> & { _id: Types.ObjectId };
export const RoomTariff = model("RoomTariff", roomTariffSchema);

// Drop old legacy index if exists
RoomTariff.collection.dropIndex("hospital_1_ward_1_roomType_1").catch(() => {});
