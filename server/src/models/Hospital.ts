import { Schema, model, InferSchemaType, Types } from "mongoose";

const hospitalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    address: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    licenseUrl: { type: String, default: "" },
    bedCapacity: { type: Number, default: 0 },
    opExpiryLimit: { type: Number, default: 10 },
    availableLabTests: { type: [String], default: [] },
    availableRadiologyTests: { type: [String], default: [] },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type Hospital = InferSchemaType<typeof hospitalSchema> & { _id: Types.ObjectId };
export const Hospital = model("Hospital", hospitalSchema);
