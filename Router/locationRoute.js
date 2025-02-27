// Import dependencies
import express from "express";
import {
  locationAdd,
  locationDelete,
  locationUpdate,
  locationView,
} from "../Controller/locationController.js";

// Create an Express router
const router = express.Router();

// Location Add Route
router.post("/add", locationAdd);

// All Location GET Route
router.get("/view", locationView);

// Location Update Route
router.put("/update/:id", locationUpdate);

// Location delete
router.delete("/delete/:id", locationDelete);

// Export the router
export default router;
