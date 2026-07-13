import { Schema, model, InferSchemaType, Types } from "mongoose";

const admissionSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    opVisit: { type: Schema.Types.ObjectId, ref: "OPVisit", default: null },
    admissionNumber: { type: String, required: true, unique: true },
    admissionDate: { type: Date, required: true },
    admissionTime: { type: String, default: "" },
    ward: { type: String, required: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    bed: { type: Schema.Types.ObjectId, ref: "Bed", required: true },
    attenderName: { type: String, required: true },
    attenderPhone: { type: String, required: true },
    insuranceProvider: { type: String, default: "" },
    insurancePolicyNumber: { type: String, default: "" },
    advanceAmount: { type: Number, default: 0 },
    admissionNotes: { type: String, default: "" },
    status: {
      type: String,
      enum: [
        "admitted",
        "discharged",
        "Admitted",
        "Bed Allocated",
        "Under Observation",
        "Waiting for Bed",
        "In Ward",
        "ICU",
        "Operation Scheduled",
        "Under Treatment",
        "Transferred",
        "Discharged",
        "Cancelled",
        "Expired",
        "Against Medical Advice (AMA)",
        "Transferred Out (Final)"
      ],
      default: "Admitted"
    },
    dischargeDate: { type: Date, default: null },
    dischargeNotes: { type: String, default: "" },
    
    // Receptionist Initiated Admission & Audit Fields
    admittingDoctor: { type: Schema.Types.ObjectId, ref: "Doctor", default: null },
    priority: { type: String, enum: ["Routine", "Urgent", "Emergency"], default: "Routine" },
    admissionMode: { type: String, enum: ["Doctor Requested", "Receptionist Initiated"], default: "Doctor Requested" },
    approvalType: { type: String, enum: ["Doctor Request System", "Doctor Verbal Order"], default: "Doctor Request System" },
    admissionReason: { type: String, default: "" },
    
    // Additional fields for Manual Admission
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    admissionType: { type: String, enum: ["Emergency", "Elective", "Direct Admission"], default: "Direct Admission" },
    expectedStay: { type: String, default: "" },
    primaryDiagnosis: { type: String, default: "" }
  },
  { timestamps: true }
);

export type Admission = InferSchemaType<typeof admissionSchema> & { _id: Types.ObjectId };
export const Admission = model("Admission", admissionSchema);

