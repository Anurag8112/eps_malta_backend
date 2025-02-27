// Import dependencies
import express from "express";
import {
  templateAdd,
  templateDelete,
  templateEdit,
  templateView,
} from "../Controller/templateController.js";

// Create an Express router
const router = express.Router();

// GET || API
router.get("/view", templateView);

// POST || API
router.post("/add", templateAdd);

// PUT || API
router.put("/edit/:id", templateEdit);

// DELETE || API
router.delete("/delete/:id", templateDelete);

// Export the router
export default router;
