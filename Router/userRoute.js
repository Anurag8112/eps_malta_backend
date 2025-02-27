// Import dependencies
import express from "express";
import {
  getUserProfileData,
  userAdd,
  userDelete,
  userEdit,
  userSummaryView,
  userView,
} from "../Controller/userController.js";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";

// Create an Express router
const router = express.Router();

// User Register Route
router.post("/register", userAdd);

// User All view Route
router.get("/view", userView);

// Edit User Profile view Route
router.get("/profile/view",authenticateJWT, getUserProfileData);

// User Edit Route
router.put("/edit/:id", userEdit);

// User Delete Route
router.delete("/delete/:id", userDelete);

// User Summary Route (Qualifiction, Skills, Languages)
router.get("/summary/view",userSummaryView);

// Export the router
export default router;
