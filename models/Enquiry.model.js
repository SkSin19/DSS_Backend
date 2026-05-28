import mongoose from "mongoose";

const EnquirySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    productName: { type: String, required: true, trim: true },
    productSlug: { type: String, required: true, trim: true, index: true },
    productModel: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
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

EnquirySchema.index({ productId: 1, email: 1, status: 1, createdAt: -1 });

export default mongoose.model("Enquiry", EnquirySchema);