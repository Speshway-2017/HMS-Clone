import { Schema, model, InferSchemaType, Types } from "mongoose";

const wardSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    name: { type: String, required: true },
    code: { type: String, required: true },
    wardType: {
      type: String,
      enum: [
        "General Ward",
        "Semi-Private Ward",
        "Private Ward",
        "VIP Ward",
        "ICU",
        "NICU",
        "PICU",
        "Emergency",
        "Emergency Ward",
        "Operation Theatre",
        "Labour Ward",
        "Maternity",
        "Isolation",
        "Semi Private",
        "Private",
        "Deluxe",
        "VIP"
      ],
      required: true
    },
    floorNumber: { type: Number, required: true },
    maxRooms: { type: Number, default: 20 },
    nurseStation: { type: String, default: "" },
    description: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
  },
  { timestamps: true }
);

// Composite index to enforce unique name/code per hospital & branch
wardSchema.index({ hospital: 1, branch: 1, name: 1 }, { unique: true });
wardSchema.index({ hospital: 1, branch: 1, code: 1 }, { unique: true });

export type Ward = InferSchemaType<typeof wardSchema> & { _id: Types.ObjectId };
export const Ward = model("Ward", wardSchema);

// Drop old legacy single-hospital indexes if they exist
Ward.collection.dropIndex("hospital_1_name_1").catch(() => {});
Ward.collection.dropIndex("hospital_1_code_1").catch(() => {});
