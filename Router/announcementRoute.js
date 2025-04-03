import express from "express";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";
import { createAnnouncement, getAnnouncements } from "../Controller/announcementController.js";

const router = express.Router();

router.post("/post", authenticateJWT, createAnnouncement);
router.get("", authenticateJWT, getAnnouncements);

export default router;
