import express from "express";
import { getNotificationLog } from "../../Controller/LicenseTrackerController/notificationLogController.js";

const router = express.Router();

// GET || ROUTER
router.get("/view", getNotificationLog);

// Export the router
export default router;
