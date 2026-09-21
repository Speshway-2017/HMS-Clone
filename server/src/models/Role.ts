import { Schema, model, InferSchemaType, Types } from "mongoose";

const customRoleSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    role: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Add compound index to guarantee unique role keys within the same hospital
customRoleSchema.index({ hospital: 1, role: 1 }, { unique: true });

export type CustomRole = InferSchemaType<typeof customRoleSchema> & { _id: Types.ObjectId };
export const CustomRole = model<CustomRole>("Role", customRoleSchema);
