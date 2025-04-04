import express from "express";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";
import { uploadAttachment } from "../Controller/uploadController.js";


const router = express.Router();

router.post("/attachment", authenticateJWT, uploadAttachment);

export default router;
