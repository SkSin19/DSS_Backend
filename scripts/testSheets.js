import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { appendEnquiryToSheet } from "../lib/googleSheets.js";

const fake = {
  _id: "test-" + Date.now(),
  submittedAt: new Date(),
  name: "TEST NAME",
  company: "TEST CO",
  email: "test@example.com",
  phoneE164: "+919999999999",
  phoneCountryCode: "+91",
  phoneNumber: "9999999999",
  city: "Test City",
  enquiryAbout: "other",
  message: "This is a diagnostic test row.",
  status: "submitted",
  source: "test-script",
  ipAddress: "127.0.0.1",
  userAgent: "test-cli",
};

try {
  console.log("SPREADSHEET_ID:", process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
  console.log("TAB_NAME     :", process.env.GOOGLE_SHEETS_TAB_NAME || "(default: Enquiries)");
  console.log("B64 length   :", (process.env.GOOGLE_SERVICE_ACCOUNT_B64 || "").length);
  await appendEnquiryToSheet(fake, "general");
  console.log("SUCCESS - row appended");
  process.exit(0);
} catch (err) {
  console.error("FAILED:", err.message);
  if (err.response?.data) console.error("Google says:", JSON.stringify(err.response.data, null, 2));
  else console.error(err.stack);
  process.exit(1);
}
