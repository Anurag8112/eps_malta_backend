import express from "express";
import {
  addLicenseType,
  deleteLicenseType,
  editLicenseType,
  getLicenseType,
} from "../../Controller/LicenseTrackerController/licenseTypeController.js";

const router = express.Router();

// GET || ROUTER
router.get("/view", getLicenseType);

// POST || ROUTER
router.post("/add", addLicenseType);

// PUT || ROUTER
router.put("/edit/:id", editLicenseType);

// DELETE || ROUTER
router.delete("/delete/:id", deleteLicenseType);

// Export the router
export default router;
