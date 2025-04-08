import express from "express";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";
import { getUserSettings, updateUserSettings } from "../Controller/userSettingsController.js";


const router = express.Router();

router.put("", authenticateJWT, updateUserSettings);
router.get("", authenticateJWT, getUserSettings);

export default router;
