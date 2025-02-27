import express from "express";
import {
  addReport,
  deleteReport,
  editReport,
  getReport,
  licenseDetails,
} from "../../Controller/LicenseTrackerController/licenseReportController.js";
import multer from "multer";

// Define the storage location and filename format for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // define the storage directory
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/:/g, "-"); // define the filename format
    cb(null, `${timestamp}-${file.originalname}`);
  },
});

// Define the Multer middleware with the storage option
const upload = multer({ storage: storage });

const router = express.Router();

// GET || ROUTER
router.get("/view", getReport);

// GET || ROUTER
router.get("/licenseDetails", licenseDetails);

// POST || ROUTER
router.post("/add", upload.single("receipt"), addReport);

// PUT || ROUTER
router.put("/edit/:id", upload.single("receipt"), editReport);

// DELETE || ROUTER
router.delete("/delete/:id", deleteReport);

// Export the router
export default router;
