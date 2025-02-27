// Import dependencies
import express from "express";
import {
  tasksAdd,
  tasksDelete,
  tasksUpdate,
  tasksView,
} from "../Controller/tasksController.js";

// Create an Express router
const router = express.Router();

// tasks Add Route
router.post("/add", tasksAdd);

// All tasks GET Route
router.get("/view", tasksView);

// tasks Update Route
router.put("/update/:id", tasksUpdate);

// tasks delete
router.delete("/delete/:id", tasksDelete);

// Export the router
export default router;
