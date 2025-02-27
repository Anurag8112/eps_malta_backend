// Import dependencies
import express from "express";
import {
  SportsDelete,
  SportsUpdate,
  SportsView,
  Sportsadd,
} from "../Controller/sportController.js";

// Create an Express router
const router = express.Router();

// sport Add Route
router.post("/add", Sportsadd);

// All sport GET Route
router.get("/view", SportsView);

// sport Update Route
router.put("/update/:id", SportsUpdate);

// sport delete
router.delete("/delete/:id", SportsDelete);

// Export the router
export default router;
