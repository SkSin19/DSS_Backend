import rateLimit from "express-rate-limit";

const enquiryRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many enquiries from this device. Please try again later.",
  },
});

export default enquiryRateLimit;
