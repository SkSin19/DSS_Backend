import crypto from "crypto";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import ProductModel from "../models/Product.model.js";
import EnquiryModel from "../models/Enquiry.model.js";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

const ensureDatabaseReady = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      message: "MongoDB is not connected yet. Set MONGODB_URI in backend/.env to enable enquiry submissions.",
    });

    return false;
  }

  return true;
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeCountryCode = (value) => {
  const code = String(value || "").trim().replace(/\s+/g, "");

  if (!code) {
    return "";
  }

  return code.startsWith("+") ? code : `+${code}`;
};

const normalizePhoneNumber = (value) => String(value || "").trim().replace(/\D/g, "");
const buildPhoneE164 = (phoneCountryCode, phoneNumber) => `${normalizeCountryCode(phoneCountryCode)}${normalizePhoneNumber(phoneNumber)}`;
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");
const generateOtp = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

const getEmailTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  });
};

const sendEmailOtp = async ({ to, otp, productName }) => {
  const transport = getEmailTransport();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transport || !fromAddress) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Enquiry Email OTP] ${to} => ${otp} (${productName})`);
      return { deliveryMode: "development", devOtp: otp };
    }

    throw new Error("Email delivery is not configured.");
  }

  await transport.sendMail({
    from: fromAddress,
    to,
    subject: `Your DSS verification code for ${productName}`,
    text: `Your verification code for ${productName} is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `<p>Your verification code for <strong>${productName}</strong> is <strong>${otp}</strong>.</p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  });

  return { deliveryMode: "email" };
};

const makeEmailOtpPayload = ({ product, email, otpHash, otpExpiresAt, userAgent, ipAddress }) => ({
  productId: product._id,
  productName: product.name,
  productSlug: product.slug,
  productModel: product.model,
  company: product.company,
  email,
  emailOtpHash: otpHash,
  emailOtpExpiresAt: otpExpiresAt,
  emailOtpSentAt: new Date(),
  emailOtpVerifiedAt: null,
  phoneCountryCode: "",
  phoneNumber: "",
  phoneE164: "",
  message: "",
  status: "email_pending",
  verificationMethod: "email_otp",
  verifiedAt: null,
  submittedAt: null,
  source: "website",
  userAgent: userAgent || "",
  ipAddress: ipAddress || "",
});

const makeSubmittedPayload = ({ enquiry, phoneCountryCode, phoneNumber, message, userAgent, ipAddress }) => ({
  productId: enquiry.productId,
  productName: enquiry.productName,
  productSlug: enquiry.productSlug,
  productModel: enquiry.productModel,
  company: enquiry.company,
  email: enquiry.email,
  emailOtpHash: "",
  emailOtpExpiresAt: null,
  emailOtpSentAt: enquiry.emailOtpSentAt || null,
  emailOtpVerifiedAt: enquiry.emailOtpVerifiedAt || new Date(),
  phoneCountryCode,
  phoneNumber,
  phoneE164: buildPhoneE164(phoneCountryCode, phoneNumber),
  message,
  status: "submitted",
  verificationMethod: "email_otp",
  verifiedAt: enquiry.emailOtpVerifiedAt || new Date(),
  submittedAt: new Date(),
  source: enquiry.source || "website",
  userAgent: userAgent || enquiry.userAgent || "",
  ipAddress: ipAddress || enquiry.ipAddress || "",
});

const RequestEmailOtp = async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) {
      return;
    }

    const productId = String(req.body.productId || "").trim();
    const email = normalizeEmail(req.body.email);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Valid product details are required." });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const product = await ProductModel.findById(productId).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const existing = await EnquiryModel.findOne({
      productId,
      email,
      status: { $in: ["email_pending", "email_verified"] },
    }).sort({ createdAt: -1 });

    const draftPayload = makeEmailOtpPayload({
      product,
      email,
      otpHash,
      otpExpiresAt,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    const enquiry = existing
      ? await EnquiryModel.findByIdAndUpdate(existing._id, draftPayload, { new: true })
      : await EnquiryModel.create(draftPayload);

    const delivery = await sendEmailOtp({ to: email, otp, productName: product.name });

    return res.status(200).json({
      message: "Verification code sent successfully.",
      enquiryId: enquiry._id,
      email: enquiry.email,
      expiresAt: otpExpiresAt,
      deliveryMode: delivery.deliveryMode,
      devOtp: delivery.devOtp,
      product: {
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        model: product.model,
        company: product.company,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to send email verification code.",
      error: error.message,
    });
  }
};

const VerifyEmailOtp = async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) {
      return;
    }

    const enquiryId = String(req.body.enquiryId || "").trim();
    const otp = String(req.body.otp || "").trim();

    if (!mongoose.Types.ObjectId.isValid(enquiryId)) {
      return res.status(400).json({ message: "A valid verification reference is required." });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter the 6-digit code sent to your email." });
    }

    const enquiry = await EnquiryModel.findById(enquiryId);

    if (!enquiry) {
      return res.status(404).json({ message: "Verification record not found." });
    }

    if (!enquiry.emailOtpHash || !enquiry.emailOtpExpiresAt) {
      return res.status(400).json({ message: "Please request a new verification code." });
    }

    if (enquiry.emailOtpExpiresAt.getTime() < Date.now()) {
      await EnquiryModel.findByIdAndUpdate(enquiry._id, { status: "expired" });
      return res.status(400).json({ message: "The verification code has expired. Please request a new one." });
    }

    if (hashOtp(otp) !== enquiry.emailOtpHash) {
      return res.status(400).json({ message: "The verification code you entered is incorrect." });
    }

    const updatedEnquiry = await EnquiryModel.findByIdAndUpdate(
      enquiry._id,
      {
        emailOtpVerifiedAt: new Date(),
        status: "email_verified",
        verifiedAt: new Date(),
      },
      { new: true },
    );

    return res.status(200).json({
      message: "Email verified successfully.",
      enquiryId: updatedEnquiry._id,
      email: updatedEnquiry.email,
      status: updatedEnquiry.status,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to verify email code.",
      error: error.message,
    });
  }
};

const SubmitEnquiry = async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) {
      return;
    }

    const enquiryId = String(req.body.enquiryId || "").trim();
    const phoneCountryCode = normalizeCountryCode(req.body.phoneCountryCode);
    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);
    const message = String(req.body.message || "").trim();

    if (!mongoose.Types.ObjectId.isValid(enquiryId)) {
      return res.status(400).json({ message: "A valid enquiry reference is required." });
    }

    if (!phoneCountryCode || !/^\+\d{1,4}$/.test(phoneCountryCode)) {
      return res.status(400).json({ message: "Enter a valid country code." });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Phone number must contain exactly 10 digits." });
    }

    if (message.length < 10) {
      return res.status(400).json({ message: "Please add a short message before submitting." });
    }

    const enquiry = await EnquiryModel.findById(enquiryId);

    if (!enquiry) {
      return res.status(404).json({ message: "Enquiry not found." });
    }

    if (enquiry.status !== "email_verified") {
      return res.status(400).json({ message: "Please verify your email before submitting the enquiry." });
    }

    const updatedEnquiry = await EnquiryModel.findByIdAndUpdate(
      enquiry._id,
      makeSubmittedPayload({
        enquiry,
        phoneCountryCode,
        phoneNumber,
        message,
        userAgent: req.get("user-agent"),
        ipAddress: req.ip,
      }),
      { new: true },
    );

    return res.status(200).json({
      message: "Enquiry submitted successfully.",
      enquiry: {
        id: updatedEnquiry._id,
        productName: updatedEnquiry.productName,
        productSlug: updatedEnquiry.productSlug,
        productModel: updatedEnquiry.productModel,
        productId: updatedEnquiry.productId,
        email: updatedEnquiry.email,
        phoneCountryCode: updatedEnquiry.phoneCountryCode,
        phoneNumber: updatedEnquiry.phoneNumber,
        phoneE164: updatedEnquiry.phoneE164,
        message: updatedEnquiry.message,
        status: updatedEnquiry.status,
        submittedAt: updatedEnquiry.submittedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to submit enquiry.",
      error: error.message,
    });
  }
};

export { RequestEmailOtp, VerifyEmailOtp, SubmitEnquiry };