import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { sendMessage, listMessages, sendMessageSchema, listMessagesSchema } from "../controllers/chatController.js";

const router = express.Router();

router.get("/", protect, validate(listMessagesSchema), listMessages);
router.post("/", protect, validate(sendMessageSchema), sendMessage);

export default router;
