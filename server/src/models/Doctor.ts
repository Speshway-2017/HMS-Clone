import { Schema, model, InferSchemaType, Types } from "mongoose";

export const DOCTOR_STATUSES = ["on_duty", "on_leave", "off_duty", "ACTIVE", "INACTIVE", "RETIRED", "TRANSFERRED"] as const;

const doctorSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    gender: { type: String, enum: ["Male", "Female", "Other", "male", "female", "other"], default: "Male", required: true },
    email: { type: String, default: "", maxlength: 254 },
    phone: { type: String, default: "", maxlength: 10 },
    photoUrl: { type: String, default: "", maxlength: 500 },
    specialization: { type: String, default: "", maxlength: 100 },
    qualification: { type: String, default: "", maxlength: 200 },
    licenseNo: { type: String, default: "", maxlength: 50 },
    bio: { type: String, default: "", maxlength: 500 },
    workingHours: {
      type: [
        {
          day: { type: String, required: true },
          from: { type: String, default: "09:00" },
          to: { type: String, default: "17:00" },
          active: { type: Boolean, default: true }
        }
      ],
      default: [
        { day: "Monday",    from: "09:00", to: "17:00", active: true  },
        { day: "Tuesday",   from: "09:00", to: "17:00", active: true  },
        { day: "Wednesday", from: "09:00", to: "13:00", active: true  },
        { day: "Thursday",  from: "09:00", to: "17:00", active: true  },
        { day: "Friday",    from: "09:00", to: "17:00", active: true  },
        { day: "Saturday",  from: "10:00", to: "13:00", active: false },
        { day: "Sunday",    from: "—",     to: "—",     active: false },
      ]
    },
    consultationSettings: {
      type: {
        slotDuration: { type: Number, default: 15 },
        maxPatients: { type: Number, default: 25 },
        breakTime: { type: String, default: "13:00" }
      },
      default: {
        slotDuration: 15,
        maxPatients: 25,
        breakTime: "13:00"
      }
    },
    monthlyAvailability: {
      type: [
        {
          date: { type: String, required: true }, // YYYY-MM-DD
          from: { type: String, default: "09:00" },
          to: { type: String, default: "17:00" },
          active: { type: Boolean, default: true }
        }
      ],
      default: []
    },
    languages: { type: String, default: "English, Hindi", maxlength: 200 },
    consultationFee: { type: String, default: "₹500" },
    opExpiryLimit: { type: Number, default: 10 },
    status: { type: String, enum: DOCTOR_STATUSES, default: "ACTIVE" },
    rating: { type: Number, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    shift: { type: String, default: "General" },
    basicSalary: { type: Number, default: 120000 },
    allowances: { type: Number, default: 15000 },
    incentives: { type: Number, default: 0 },
    pfEligible: { type: Boolean, default: true },
    esiEligible: { type: Boolean, default: false },
    professionalTax: { type: Number, default: 200 },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export type Doctor = InferSchemaType<typeof doctorSchema> & { _id: Types.ObjectId };
export const Doctor = model("Doctor", doctorSchema);
