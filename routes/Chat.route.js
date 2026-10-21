import { Router } from "express";
import { ChatWithAssistant } from "../controllers/Chat.controller.js";
import { chatBurstLimit, chatDailyLimit } from "../middlewares/chatRateLimit.js";

const ChatRouter = Router();

ChatRouter.post("/chat", chatBurstLimit, chatDailyLimit, ChatWithAssistant);

export default ChatRouter;
