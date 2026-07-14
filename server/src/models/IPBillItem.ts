import { Schema, model, InferSchemaType, Types } from "mongoose";

const ipBillItemSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    bill: { type: Schema.Types.ObjectId, ref: "IPBill", required: true },
    category: {
      type: String,
      enum: [
        "Room Charges",
        "Ward Charges",
        "Bed Charges",
        "Doctor Visit Charges",
        "Nursing Charges",
        "Procedure Charges",
        "Operation Charges",
        "Laboratory Charges",
        "Radiology Charges",
        "Pharmacy Charges",
        "Consumables",
        "Medical Equipment",
        "Oxygen Charges",
        "Blood Charges",
        "ICU Charges",
        "Miscellaneous Charges"
      ],
      required: true
    },
    description: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    days: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true },
    isSystemGenerated: { type: Boolean, default: false },
    externalId: { type: String, default: null } // used to prevent duplicate auto-charges
  },
  { timestamps: true }
);

// Index to prevent double billing of the same auto-charge entry
ipBillItemSchema.index({ hospital: 1, bill: 1, externalId: 1 }, { unique: true, sparse: true });

export type IPBillItem = InferSchemaType<typeof ipBillItemSchema> & { _id: Types.ObjectId };
export const IPBillItem = model("IPBillItem", ipBillItemSchema);
