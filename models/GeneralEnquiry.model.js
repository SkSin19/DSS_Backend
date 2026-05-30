import mongoose from "mongoose";

const GeneralEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    emailOtpHash: { type: String, default: "" },
    emailOtpExpiresAt: { type: Date, default: null, index: true },
    emailOtpSentAt: { type: Date, default: null },
    emailOtpVerifiedAt: { type: Date, default: null },
    phoneCountryCode: { type: String, default: "", trim: true },
    phoneNumber: { type: String, default: "", trim: true },
    phoneE164: { type: String, default: "", trim: true, index: true },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["email_pending", "email_verified", "submitted", "expired"],
      default: "email_pending",
      index: true,
    },
    verificationMethod: { type: String, default: "email_otp" },
    verifiedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    source: { type: String, default: "website" },
    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
  },
  { timestamps: true },
);

GeneralEnquirySchema.index({ email: 1, status: 1, createdAt: -1 });

export default mongoose.model("GeneralEnquiry", GeneralEnquirySchema);
