import { google } from "googleapis";

let sheetsClientPromise = null;
let headerEnsuredPromise = null;

const HEADER_ROW = [
  "Submitted At",
  "Type",
  "Name",
  "Company",
  "Email",
  "Phone (E.164)",
  "Country Code",
  "Phone Number",
  "City",
  "Enquiry About",
  "Product Name",
  "Product Model",
  "Product Slug",
  "Product ID",
  "Product Company",
  "Message",
  "Status",
  "Source",
  "IP Address",
  "User Agent",
  "Enquiry ID",
];

const decodeServiceAccount = () => {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 is not set.");
  const json = Buffer.from(b64.trim(), "base64").toString("utf8");
  return JSON.parse(json);
};

const getSheetsClient = () => {
  if (sheetsClientPromise) return sheetsClientPromise;
  sheetsClientPromise = (async () => {
    const creds = decodeServiceAccount();
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    await auth.authorize();
    return google.sheets({ version: "v4", auth });
  })().catch((err) => {
    sheetsClientPromise = null;
    throw err;
  });
  return sheetsClientPromise;
};

const ensureHeaderRow = async (sheets, spreadsheetId, tabName) => {
  if (headerEnsuredPromise) return headerEnsuredPromise;
  headerEnsuredPromise = (async () => {
    const range = `${tabName}!A1:U1`;
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const row = existing.data.values && existing.data.values[0];
    if (!row || row.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        requestBody: { values: [HEADER_ROW] },
      });
    }
  })().catch((err) => {
    headerEnsuredPromise = null;
    throw err;
  });
  return headerEnsuredPromise;
};

const rowFromEnquiry = (enquiry, type) => {
  const submittedAt = enquiry.submittedAt
    ? new Date(enquiry.submittedAt).toISOString()
    : new Date().toISOString();
  return [
    submittedAt,
    type,
    enquiry.name || "",
    enquiry.company || "",
    enquiry.email || "",
    enquiry.phoneE164 || "",
    enquiry.phoneCountryCode || "",
    enquiry.phoneNumber || "",
    enquiry.city || "",
    enquiry.enquiryAbout || "",
    enquiry.productName || "",
    enquiry.productModel || "",
    enquiry.productSlug || "",
    enquiry.productId ? String(enquiry.productId) : "",
    enquiry.productCompany || enquiry.company || "",
    enquiry.message || "",
    enquiry.status || "",
    enquiry.source || "",
    enquiry.ipAddress || "",
    enquiry.userAgent || "",
    enquiry._id ? String(enquiry._id) : "",
  ];
};

export const appendEnquiryToSheet = async (enquiry, type) => {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tabName = process.env.GOOGLE_SHEETS_TAB_NAME || "Enquiries";
  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set.");

  const sheets = await getSheetsClient();
  await ensureHeaderRow(sheets, spreadsheetId, tabName);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:U`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [rowFromEnquiry(enquiry, type)] },
  });
};

export const appendEnquiryToSheetSafe = (enquiry, type) => {
  Promise.resolve()
    .then(() => appendEnquiryToSheet(enquiry, type))
    .catch((err) => {
      console.error(`[GoogleSheets] Failed to append ${type} enquiry:`, err.message);
    });
};
