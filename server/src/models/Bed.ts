import { Schema, model, InferSchemaType, Types } from "mongoose";

const bedSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    ward: { type: Schema.Types.ObjectId, ref: "Ward", required: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    bedNumber: { type: String, required: true },
    bedCode: { type: String, required: true },
    bedType: { type: String, default: "Standard" },
    status: {
      type: String,
      enum: ["Available", "Occupied", "Reserved", "Cleaning", "Maintenance", "Blocked"],
      default: "Available"
    },
    isOccupied: { type: Boolean, default: false },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", default: null },
    admission: { type: Schema.Types.ObjectId, ref: "Admission", default: null },
    lastSanitized: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Composite unique index for bedNumber in a room
bedSchema.index({ hospital: 1, room: 1, bedNumber: 1 }, { unique: true });
// Unique bedCode in a hospital
bedSchema.index({ hospital: 1, bedCode: 1 }, { unique: true });

// Sync status and isOccupied fields
bedSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.isOccupied = this.status !== "Available";
  } else if (this.isModified("isOccupied")) {
    this.status = this.isOccupied ? "Occupied" : "Available";
  }
  next();
});

export type Bed = InferSchemaType<typeof bedSchema> & { _id: Types.ObjectId };
export const Bed = model("Bed", bedSchema);
