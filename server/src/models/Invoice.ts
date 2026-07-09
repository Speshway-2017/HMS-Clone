import { Schema, model, InferSchemaType, Types } from "mongoose";

export const INVOICE_STATUSES = ["pending", "partially_paid", "paid", "overdue"] as const;

const invoiceItemSchema = new Schema(
  {
    description: { type: String, required: true },
    category: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    items: { type: [invoiceItemSchema], default: [] },
    taxRate: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    insuranceCoveragePercent: { type: Number, default: 0 },
    status: { type: String, enum: INVOICE_STATUSES, default: "pending" },
    issuedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true },
);

export type Invoice = InferSchemaType<typeof invoiceSchema> & { _id: Types.ObjectId };
export const Invoice = model("Invoice", invoiceSchema);
