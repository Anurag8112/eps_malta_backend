// Import dependencies
import express from "express";
import {
  languageAdd,
  languageDelete,
  languageView,
  languageUpdate
} from "../Controller/languageController.js";

// Create an Express router
const router = express.Router();

// Language Add Route
router.post("/add", languageAdd);

// All Language GET Route
router.get("/view", languageView);

// Language Update Route
router.put("/update/:id", languageUpdate);

// Language delete
router.delete("/delete/:id", languageDelete);

// Export the router
export default router;
