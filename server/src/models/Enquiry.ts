import { Schema, model, InferSchemaType, Types } from "mongoose";

const enquirySchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    subject: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "responded", "archived"], default: "pending" },
  },
  { timestamps: true },
);

export type Enquiry = InferSchemaType<typeof enquirySchema> & { _id: Types.ObjectId };
export const Enquiry = model("Enquiry", enquirySchema);
