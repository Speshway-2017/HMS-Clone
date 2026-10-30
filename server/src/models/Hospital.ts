import { Schema, model, InferSchemaType, Types } from "mongoose";

const hospitalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 20 },
    address: { type: String, default: "", maxlength: 250 },
    contactEmail: { type: String, default: "", maxlength: 100 },
    contactPhone: { type: String, default: "", maxlength: 20 },
    logoUrl: { type: String, default: "" },
    licenseUrl: { type: String, default: "" },
    bedCapacity: { type: Number, default: 0 },
    opExpiryLimit: { type: Number, default: 10 },
    availableLabTests: { type: [String], default: [] },
    availableRadiologyTests: { type: [String], default: [] },
    investigationPrices: { type: Map, of: Number, default: {} },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    // Website Customization Parameters
    heroBannerUrl: { type: String, default: "" },
    aboutText: { type: String, default: "" },
    googleMapsLink: { type: String, default: "" },
    workingHours: { type: String, default: "" },
    footerText: { type: String, default: "" },
    socialLinks: { type: Map, of: String, default: {} },
    faqs: {
      type: [{ q: { type: String, default: "" }, a: { type: String, default: "" } }],
      default: []
    },
    heroTitle: { type: String, default: "" },
    heroSub: { type: String, default: "" },
    whyChooseUs: {
      type: [{ title: { type: String, default: "" }, desc: { type: String, default: "" } }],
      default: []
    },
    missionText: { type: String, default: "" },
    visionText: { type: String, default: "" },
    valuesText: { type: String, default: "" },
  },
  { timestamps: true },
);

export type Hospital = InferSchemaType<typeof hospitalSchema> & { _id: Types.ObjectId };
export const Hospital = model("Hospital", hospitalSchema);
