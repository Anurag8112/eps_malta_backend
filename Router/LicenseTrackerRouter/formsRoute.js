import express from "express";
import {
  addFormsDetails,
  deleteFormsDetails,
  editFormsDetails,
  getFormsDetails,
} from "../../Controller/LicenseTrackerController/formsController.js";

const router = express.Router();

// GET || ROUTER
router.get("/view", getFormsDetails);

// POST || ROUTER
router.post("/add", addFormsDetails);

// PUT || ROUTER
router.put("/edit", editFormsDetails);

// DELETE || ROUTER
router.delete("/delete/:id", deleteFormsDetails);

// Export the router
export default router;
