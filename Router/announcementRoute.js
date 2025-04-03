import express from "express";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";
import { createAnnouncement, getAnnouncedUsers, getAnnouncements } from "../Controller/announcementController.js";

const router = express.Router();

router.post("/post", authenticateJWT, createAnnouncement);
router.get("/:announcementId/announced-users", authenticateJWT, getAnnouncedUsers);
router.get("", authenticateJWT, getAnnouncements);


export default router;
