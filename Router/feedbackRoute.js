import express from "express";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";
import { sendApplicationFeedback } from "../Controller/feedbackController.js";


const router = express.Router();

router.post("/send", authenticateJWT, sendApplicationFeedback);

export default router;
