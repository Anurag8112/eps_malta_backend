// Import dependencies
import express from "express";
import {
  eventsAdd,
  eventsDelete,
  eventsUpdate,
  eventsView,
} from "../Controller/eventsController.js";

// Create an Express router
const router = express.Router();

// events Add Route
router.post("/add", eventsAdd);

// All events GET Route
router.get("/view", eventsView);

// events Update Route
router.put("/update/:id", eventsUpdate);

// events delete
router.delete("/delete/:id", eventsDelete);

// Export the router
export default router;
