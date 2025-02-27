// Import dependencies
import express from "express";
import {
  adminAdd,
  adminLogin,
  changePassword,
  forgotPassword,
  generatePassword,
  otpValidate,
  resetPassword,
} from "../Controller/adminController.js";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";
// Create an Express router
const router = express.Router();

// Admin Register Route
router.post("/register", adminAdd);

// Admin Login Route
router.post("/login", adminLogin);

// Generate password by User
router.post("/generate-password", generatePassword);

// Admin Change Password Route
router.post("/change-password", authenticateJWT, changePassword);

// Forgot Password Route
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", otpValidate);
router.post("/update-password", resetPassword);

// Export the router
export default router;
