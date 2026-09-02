import { Router } from "express";
import { SubmitEnquiry } from "../controllers/Enquiry.controller.js";
import { SubmitGeneralEnquiry } from "../controllers/GeneralEnquiry.controller.js";
import enquiryRateLimit from "../middlewares/enquiryRateLimit.js";

const EnquiryRouter = Router();

EnquiryRouter.post("/enquiries/submit", enquiryRateLimit, SubmitEnquiry);
EnquiryRouter.post("/enquiries/general/submit", enquiryRateLimit, SubmitGeneralEnquiry);

export default EnquiryRouter;