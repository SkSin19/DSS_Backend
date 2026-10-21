import rateLimit from "express-rate-limit";

const limitMessage = {
  message: "You've sent a lot of messages. Please wait a little, or call/WhatsApp us at +91 99996 05550.",
};

// Short burst limit: 15 messages per 5 minutes per visitor.
export const chatBurstLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
});

// Daily limit: 60 messages per visitor per day.
export const chatDailyLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
});
