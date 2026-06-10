import mongoose from "mongoose";

const GeneralEnquirySchema = new mongoose.Schema(
  {
    name:             { type: String, default: "", trim: true },
    company:          { type: String, default: "", trim: true },
    email:            { type: String, required: true, trim: true, lowercase: true, index: true },
    phoneCountryCode: { type: String, default: "", trim: true },
    phoneNumber:      { type: String, default: "", trim: true },
    phoneE164:        { type: String, default: "", trim: true, index: true },
    city:             { type: String, default: "", trim: true },
    enquiryAbout:     { type: String, default: "" },
    message:          { type: String, default: "" },
    status: {
      type: String,
      enum: ["submitted", "read", "archived"],
      default: "submitted",
      index: true,
    },
    verificationMethod: { type: String, default: "turnstile" },
    submittedAt:      { type: Date, default: null },
    source:           { type: String, default: "website" },
    userAgent:        { type: String, default: "" },
    ipAddress:        { type: String, default: "" },
  },
  { timestamps: true },
);

GeneralEnquirySchema.index({ email: 1, createdAt: -1 });

export default mongoose.model("GeneralEnquiry", GeneralEnquirySchema);