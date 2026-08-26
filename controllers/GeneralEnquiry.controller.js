import mongoose from "mongoose";
import GeneralEnquiryModel from "../models/GeneralEnquiry.model.js";

const ensureDatabaseReady = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: "MongoDB is not connected yet." });
    return false;
  }
  return true;
};

const normalizeEmail       = (v) => String(v || "").trim().toLowerCase().replace(/[^a-z0-9@._+\-]/g, "");
const normalizeCountryCode = (v) => {
  const code = String(v || "").trim().replace(/\s+/g, "");
  if (!code) return "";
  return code.startsWith("+") ? code : `+${code}`;
};
const normalizePhoneNumber = (v) => String(v || "").replace(/\D/g, "").slice(0, 15);
const normalizeName        = (v) => String(v || "").trim().replace(/[\x00-\x1F<>]/g, "").slice(0, 100);
const normalizeCity        = (v) => String(v || "").trim().replace(/[\x00-\x1F<>]/g, "").slice(0, 100);
const normalizeMessage     = (v) => String(v || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F<>]/g, "").trim().slice(0, 2000);
const normalizeEnquiryAbout = (v) => {
  const allowed = ["cctv", "access", "alarm", "smart", "other"];
  const val = String(v || "").trim().toLowerCase();
  return allowed.includes(val) ? val : "";
};
const buildPhoneE164 = (code, number) => `${normalizeCountryCode(code)}${normalizePhoneNumber(number)}`;

const verifyTurnstile = async (token, remoteip) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") return true;
    throw new Error("Bot verification is not configured.");
  }
  const body = new URLSearchParams({ secret, response: token, remoteip: remoteip || "" });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const data = await res.json();
  return data.success === true;
};

const SubmitGeneralEnquiry = async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const name            = normalizeName(req.body.name);
    const company         = normalizeName(req.body.company);
    const email           = normalizeEmail(req.body.email);
    const phoneCountryCode = normalizeCountryCode(req.body.phoneCountryCode);
    const phoneNumber     = normalizePhoneNumber(req.body.phoneNumber);
    const city            = normalizeCity(req.body.city);
    const enquiryAbout    = normalizeEnquiryAbout(req.body.enquiryAbout);
    const message         = normalizeMessage(req.body.message);
    const turnstileToken  = String(req.body.turnstileToken || "").trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return res.status(400).json({ message: "Enter a valid email address." });

    if (!phoneCountryCode || !/^\+\d{1,4}$/.test(phoneCountryCode))
      return res.status(400).json({ message: "Enter a valid country code." });

    if (!/^\d{10}$/.test(phoneNumber))
      return res.status(400).json({ message: "Phone number must contain exactly 10 digits." });

    if (!turnstileToken)
      return res.status(400).json({ message: "Bot verification token is required." });

    const turnstileOk = await verifyTurnstile(turnstileToken, req.ip);
    if (!turnstileOk)
      return res.status(400).json({ message: "Bot verification failed. Please try again." });

    const enquiry = await GeneralEnquiryModel.create({
      name,
      company,
      email,
      phoneCountryCode,
      phoneNumber,
      phoneE164: buildPhoneE164(phoneCountryCode, phoneNumber),
      city,
      enquiryAbout,
      message,
      status: "submitted",
      verificationMethod: "turnstile",
      submittedAt: new Date(),
      source: "website",
      userAgent: req.get("user-agent") || "",
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      message: "Enquiry submitted successfully.",
      enquiry: {
        id: enquiry._id,
        email: enquiry.email,
        phoneE164: enquiry.phoneE164,
        message: enquiry.message,
        status: enquiry.status,
        submittedAt: enquiry.submittedAt,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to submit enquiry.",
      error: error.message,
      ...(String(process.env.NODE_ENV || "").toLowerCase() !== "production" ? { stack: error.stack } : {}),
    });
  }
};

export { SubmitGeneralEnquiry };