// Import dependencies
import express from "express";
import { rosterView } from "../Controller/rosterController.js";

// Create an Express router
const router = express.Router();

// All roster GET Route
router.get("/view", rosterView);

// Export the router
export default router;
