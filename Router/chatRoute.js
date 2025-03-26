import express from "express";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";
import { createConversations, createMessages, getConversations, getMessages } from "../Controller/chatController.js";


const router = express.Router();

router.post("/conversations", authenticateJWT, createConversations);
router.get("/conversations", authenticateJWT, getConversations);

router.post("/conversations/messages", authenticateJWT, createMessages);
router.get("/conversations/messages/:conversation_id", authenticateJWT, getMessages);


export default router;
