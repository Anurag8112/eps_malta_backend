import express from "express";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";
import { sendPushNotification } from "../Service/notificationService.js";


const router = express.Router();

router.post("/send", authenticateJWT, sendPushNotification);

export default router;
