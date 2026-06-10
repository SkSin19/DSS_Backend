import { Router } from "express";
import { SubmitEnquiry } from "../controllers/Enquiry.controller.js";
import { SubmitGeneralEnquiry } from "../controllers/GeneralEnquiry.controller.js";

const EnquiryRouter = Router();

EnquiryRouter.post("/enquiries/submit", SubmitEnquiry);
EnquiryRouter.post("/enquiries/general/submit", SubmitGeneralEnquiry);

export default EnquiryRouter;