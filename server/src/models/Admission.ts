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
        "discharge_requested",
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

    // Discharge summary (filled by doctor when finalizing discharge)
    diagnosisAtDischarge: { type: String, default: "" },
    dischargeMedications: { type: String, default: "" },
    followUp: { type: String, default: "" },
    specialInstructions: { type: String, default: "" },
    dischargeRequestedAt: { type: Date, default: null },
    dischargeRequestedBy: { type: Schema.Types.ObjectId, ref: "Doctor", default: null },

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
    primaryDiagnosis: { type: String, default: "" },
    accommodationHistory: {
      type: [
        {
          ward: { type: String, required: true },
          roomType: { type: String, required: true },
          room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
          bed: { type: Schema.Types.ObjectId, ref: "Bed", required: true },
          dailyTariff: { type: Number, required: true },
          nursingTariff: { type: Number, required: true },
          startDate: { type: Date, required: true },
          endDate: { type: Date, default: null },
          occupiedDays: { type: Number, default: 0 }
        }
      ],
      default: []
    },
    progressNotes: {
      type: [
        {
          doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
          doctorName: { type: String, required: true },
          date: { type: Date, required: true },
          time: { type: String, required: true },
          admissionDay: { type: Number, required: true },
          assessment: { type: String, required: true },
          plan: { type: String, default: "" },
          notes: { type: String, required: true }
        }
      ],
      default: []
    },
    medicationOrders: {
      type: [
        {
          drugName: { type: String, required: true },
          dosage: { type: String, required: true },
          frequency: { type: String, required: true },
          duration: { type: String, required: true },
          route: { type: String, default: "Oral" },
          status: { type: String, enum: ["active", "modified", "stopped", "resumed"], default: "active" },
          prescribingDoctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
          prescribingDoctorName: { type: String, required: true },
          orderedAt: { type: Date, required: true },
          modifiedAt: { type: Date, default: null },
          stoppedAt: { type: Date, default: null },
          notes: { type: String, default: "" },
          history: {
            type: [
              {
                action: { type: String, required: true },
                timestamp: { type: Date, required: true },
                doctorName: { type: String, required: true },
                details: { type: String, default: "" }
              }
            ],
            default: []
          }
        }
      ],
      default: []
    },
    vitals: {
      type: [
        {
          temperature: { type: String, default: "" },
          bloodPressure: { type: String, default: "" },
          pulseRate: { type: String, default: "" },
          respiratoryRate: { type: String, default: "" },
          oxygenSaturation: { type: String, default: "" },
          weight: { type: String, default: "" },
          recordedAt: { type: Date, required: true },
          recordedBy: { type: String, required: true }
        }
      ],
      default: []
    },
    timeline: {
      type: [
        {
          date: { type: Date, required: true },
          time: { type: String, required: true },
          userName: { type: String, required: true },
          userRole: { type: String, required: true },
          eventType: { type: String, required: true },
          description: { type: String, required: true }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

export type Admission = InferSchemaType<typeof admissionSchema> & { _id: Types.ObjectId };
export const Admission = model("Admission", admissionSchema);

