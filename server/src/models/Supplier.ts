import { Schema, model, InferSchemaType, Types } from "mongoose";

const supplierSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    supplierId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: "", trim: true },
    outstandingBalance: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export type Supplier = InferSchemaType<typeof supplierSchema> & { _id: Types.ObjectId };
export const Supplier = model("Supplier", supplierSchema);
