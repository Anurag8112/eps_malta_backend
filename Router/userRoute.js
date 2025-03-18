import express from "express";
import {
  getUserProfileData,
  addFCMToken,
  userAdd,
  userAddV2,
  userDelete,
  userEdit,
  userSummaryView,
  userView,
  getFCMToken,
} from "../Controller/userController.js";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";

const router = express.Router();

// Public Routes (No Authentication)
router.post("/register", authenticateJWT, userAdd);
router.post("/v2/register", userAddV2);
router.post("/fcm", addFCMToken);
router.get("/fcm", getFCMToken);

// Protected Routes (Require Authentication)
router.get("/view", authenticateJWT, userView);
router.get("/profile/view", authenticateJWT, getUserProfileData);
router.put("/edit/:id", authenticateJWT, userEdit);
router.delete("/delete/:id", authenticateJWT, userDelete);
router.get("/summary/view", authenticateJWT, userSummaryView);

export default router;
