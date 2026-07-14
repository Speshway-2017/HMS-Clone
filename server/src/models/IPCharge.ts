import { Schema, model, InferSchemaType, Types } from "mongoose";

const ipChargeSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    admission: { type: Schema.Types.ObjectId, ref: "Admission", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    category: {
      type: String,
      enum: [
        "Admission Charges",
        "Room Charges",
        "Doctor Charges",
        "Nursing Charges",
        "Laboratory Charges",
        "Radiology Charges",
        "Pharmacy Charges",
        "Procedure Charges",
        "Operation Theatre Charges",
        "Equipment Charges",
        "Diet Charges",
        "Miscellaneous"
      ],
      required: true
    },
    serviceName: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    remarks: { type: String, default: "" },
    total: { type: Number, required: true },
    isSystemGenerated: { type: Boolean, default: false },
    externalId: { type: String, default: null },
    postedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Prevent duplicate postings for same system-generated service/external reference within an admission
ipChargeSchema.index({ hospital: 1, admission: 1, externalId: 1 }, { unique: true, sparse: true });

export type IPCharge = InferSchemaType<typeof ipChargeSchema> & { _id: Types.ObjectId };
export const IPCharge = model("IPCharge", ipChargeSchema);
