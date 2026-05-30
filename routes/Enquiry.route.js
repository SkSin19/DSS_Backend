import { Router } from "express";
import { RequestEmailOtp, VerifyEmailOtp, SubmitEnquiry } from "../controllers/Enquiry.controller.js";
import { RequestEmailOtpGeneral, VerifyEmailOtpGeneral, SubmitGeneralEnquiry } from "../controllers/GeneralEnquiry.controller.js";

const EnquiryRouter = Router();

// Product-specific enquiries (existing)
EnquiryRouter.post("/enquiries/request-email-otp", RequestEmailOtp);
EnquiryRouter.post("/enquiries/verify-email-otp", VerifyEmailOtp);
EnquiryRouter.post("/enquiries/submit", SubmitEnquiry);

// General enquiries (Get In Touch / site-wide) — product fields not required
EnquiryRouter.post("/enquiries/general/request-email-otp", RequestEmailOtpGeneral);
EnquiryRouter.post("/enquiries/general/verify-email-otp", VerifyEmailOtpGeneral);
EnquiryRouter.post("/enquiries/general/submit", SubmitGeneralEnquiry);

export default EnquiryRouter;