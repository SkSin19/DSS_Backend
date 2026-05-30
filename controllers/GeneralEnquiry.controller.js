import crypto from "crypto";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import GeneralEnquiryModel from "../models/GeneralEnquiry.model.js";

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
const generateOtp = () => {
  // Development override: when DEV_OTP is set and not in production, return that value
  const devOtp = process.env.DEV_OTP;
  if (devOtp && String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
    return String(devOtp).padStart(OTP_LENGTH, "0").slice(-OTP_LENGTH);
  }

  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
};

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

const sendEmailOtp = async ({ to, otp }) => {
  const transport = getEmailTransport();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transport || !fromAddress) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[General Enquiry Email OTP] ${to} => ${otp}`);
      return { deliveryMode: "development", devOtp: otp };
    }

    throw new Error("Email delivery is not configured.");
  }

  try {
    await transport.sendMail({
      from: fromAddress,
      to,
      subject: `Your DSS verification code`,
      text: `Your verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: `<p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    });

    return { deliveryMode: "email" };
  } catch (sendErr) {
    if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
      console.debug("Failed to send general enquiry OTP email (dev fallback):", sendErr.message || sendErr);
    } else {
      console.error("Failed to send general enquiry OTP email:", sendErr);
    }

    if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
      return { deliveryMode: "development", devOtp: otp };
    }

    throw sendErr;
  }
};

const makeEmailOtpPayload = ({ email, otpHash, otpExpiresAt, name, company, message, userAgent, ipAddress }) => ({
  name: name || "",
  company: company || "",
  email,
  emailOtpHash: otpHash,
  emailOtpExpiresAt: otpExpiresAt,
  emailOtpSentAt: new Date(),
  emailOtpVerifiedAt: null,
  phoneCountryCode: "",
  phoneNumber: "",
  phoneE164: "",
  message: message || "",
  status: "email_pending",
  verificationMethod: "email_otp",
  verifiedAt: null,
  submittedAt: null,
  source: "website",
  userAgent: userAgent || "",
  ipAddress: ipAddress || "",
});

const makeSubmittedPayload = ({ enquiry, phoneCountryCode, phoneNumber, message, userAgent, ipAddress }) => ({
  name: enquiry.name || "",
  company: enquiry.company || "",
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

const RequestEmailOtpGeneral = async (req, res) => {
  // prepare variables in outer scope so catch/fallback can use them
  let otp;
  let otpHash;
  let otpExpiresAt;
  let existing;
  let draftPayload;
  let enquiry;

  try {
    if (!ensureDatabaseReady(res)) return;

    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || "").trim();
    const company = String(req.body.company || "").trim();
    const messageIn = String(req.body.message || "").trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    otp = generateOtp();
    otpHash = hashOtp(otp);
    otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    existing = await GeneralEnquiryModel.findOne({ email, status: { $in: ["email_pending", "email_verified"] } }).sort({ createdAt: -1 });

    draftPayload = makeEmailOtpPayload({ email, otpHash, otpExpiresAt, name, company, message: messageIn, userAgent: req.get("user-agent"), ipAddress: req.ip });

    enquiry = existing
      ? await GeneralEnquiryModel.findByIdAndUpdate(existing._id, draftPayload, { returnDocument: 'after' })
      : await GeneralEnquiryModel.create(draftPayload);

    const delivery = await sendEmailOtp({ to: email, otp });

    return res.status(200).json({
      message: "Verification code sent successfully.",
      enquiryId: enquiry._id,
      email: enquiry.email,
      expiresAt: otpExpiresAt,
      deliveryMode: delivery.deliveryMode,
      devOtp: delivery.devOtp,
    });
  } catch (error) {
    console.error(error);

    // Development-only debug dump to help reproduce issues
    if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
      try {
        console.debug("RequestEmailOtpGeneral error context:", {
          email: req.body?.email || null,
          name: req.body?.name || null,
          messageIn: req.body?.message || null,
          draftPayloadExists: !!draftPayload,
          enquiryExists: !!enquiry,
          otpGenerated: !!otp,
        });
      } catch (dbgErr) {
        console.debug("Failed to log debug context:", dbgErr.message || dbgErr);
      }

      // Development fallback: ensure draft exists and return devOtp so frontend can proceed
      try {
        // attempt to ensure enquiry draft exists using draftPayload if available
        if (!enquiry) {
          // create a minimal draft using available data
          const fallbackPayload = draftPayload || makeEmailOtpPayload({ email: normalizeEmail(req.body.email || ""), otpHash: hashOtp(generateOtp()), otpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000), name: String(req.body.name || "").trim(), company: String(req.body.company || "").trim(), message: String(req.body.message || "").trim(), userAgent: req.get("user-agent"), ipAddress: req.ip });
          const created = await GeneralEnquiryModel.create(fallbackPayload);
          return res.status(200).json({ message: "Verification code sent (dev fallback).", enquiryId: created._id, email: created.email, deliveryMode: "development", devOtp: process.env.DEV_OTP || null });
        }
      } catch (fallbackErr) {
        console.error("Failed to create fallback draft:", fallbackErr);
      }
    }

    return res.status(500).json({ message: "Failed to send email verification code.", error: error.message, ...(String(process.env.NODE_ENV || "").toLowerCase() !== "production" ? { stack: error.stack } : {}) });
  }
};

const VerifyEmailOtpGeneral = async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const enquiryId = String(req.body.enquiryId || "").trim();
    const otp = String(req.body.otp || "").trim();

    if (!mongoose.Types.ObjectId.isValid(enquiryId)) {
      return res.status(400).json({ message: "A valid verification reference is required." });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter the 6-digit code sent to your email." });
    }

    const enquiry = await GeneralEnquiryModel.findById(enquiryId);

    if (!enquiry) return res.status(404).json({ message: "Verification record not found." });

    // allow developer override in non-production when DEV_OTP matches
    const devOtp = String(process.env.DEV_OTP || "");
    const isDevOverride =
      devOtp && String(process.env.NODE_ENV || "").toLowerCase() !== "production" && otp === devOtp;

    if (!isDevOverride) {
      if (!enquiry.emailOtpHash || !enquiry.emailOtpExpiresAt) {
        return res.status(400).json({ message: "Please request a new verification code." });
      }

      if (enquiry.emailOtpExpiresAt.getTime() < Date.now()) {
        await GeneralEnquiryModel.findByIdAndUpdate(enquiry._id, { status: "expired" });
        return res.status(400).json({ message: "The verification code has expired. Please request a new one." });
      }

      if (hashOtp(otp) !== enquiry.emailOtpHash) {
        return res.status(400).json({ message: "The verification code you entered is incorrect." });
      }
    }

    const updated = await GeneralEnquiryModel.findByIdAndUpdate(enquiry._id, { emailOtpVerifiedAt: new Date(), status: "email_verified", verifiedAt: new Date() }, { returnDocument: 'after' });

    return res.status(200).json({ message: "Email verified successfully.", enquiryId: updated._id, email: updated.email, status: updated.status });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to verify email code.", error: error.message, ...(String(process.env.NODE_ENV || "").toLowerCase() !== "production" ? { stack: error.stack } : {}) });
  }
};

const SubmitGeneralEnquiry = async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;

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

    const enquiry = await GeneralEnquiryModel.findById(enquiryId);

    if (!enquiry) return res.status(404).json({ message: "Enquiry not found." });

    if (enquiry.status !== "email_verified") return res.status(400).json({ message: "Please verify your email before submitting the enquiry." });

    const updated = await GeneralEnquiryModel.findByIdAndUpdate(enquiry._id, makeSubmittedPayload({ enquiry, phoneCountryCode, phoneNumber, message, userAgent: req.get("user-agent"), ipAddress: req.ip }), { returnDocument: 'after' });

    return res.status(200).json({ message: "Enquiry submitted successfully.", enquiry: { id: updated._id, email: updated.email, phoneCountryCode: updated.phoneCountryCode, phoneNumber: updated.phoneNumber, phoneE164: updated.phoneE164, message: updated.message, status: updated.status, submittedAt: updated.submittedAt } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to submit enquiry.", error: error.message, ...(String(process.env.NODE_ENV || "").toLowerCase() !== "production" ? { stack: error.stack } : {}) });
  }
};

export { RequestEmailOtpGeneral, VerifyEmailOtpGeneral, SubmitGeneralEnquiry };
