// Import dependencies
import express from "express";
import {
  qualificationsAdd,
  qualificationsDelete,
  qualificationsUpdate,
  qualificationsView,
} from "../Controller/qualificationController.js";

// Create an Express router
const router = express.Router();

// Qualifications Add Route
router.post("/add", qualificationsAdd);

// All Qualifications GET Route
router.get("/view", qualificationsView);

// Qualifications Update Route
router.put("/update/:id", qualificationsUpdate);

// Qualifications delete
router.delete("/delete/:id", qualificationsDelete);

// Export the router
export default router;
