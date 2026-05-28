import { Router } from "express";
import { RequestEmailOtp, VerifyEmailOtp, SubmitEnquiry } from "../controllers/Enquiry.controller.js";

const EnquiryRouter = Router();

EnquiryRouter.post("/enquiries/request-email-otp", RequestEmailOtp);
EnquiryRouter.post("/enquiries/verify-email-otp", VerifyEmailOtp);
EnquiryRouter.post("/enquiries/submit", SubmitEnquiry);

export default EnquiryRouter;