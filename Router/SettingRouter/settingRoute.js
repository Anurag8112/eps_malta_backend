// Import dependencies
import express from "express";
import multer from "multer";
import {
  settingView,
  settingUpdate,
} from "../../Controller/SettingController/settingController.js";

// Define the storage location and filename format for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/images/"); // define the storage directory
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/:/g, "-"); // define the filename format
    cb(null, `${timestamp}-${file.originalname}`);
  },
});

// Define the Multer middleware with the storage option
const upload = multer({ storage: storage });

// Create an Express router
const router = express.Router();

// GET || API
router.get("/view", settingView);

// ADD || API
// router.post(
//   "/add",
//   upload.fields([
//     { name: "company_logo", maxCount: 1 },
//     { name: "pdf_header_logo", maxCount: 1 },
//   ]),
//   settingAdd
// );

// UPDATE || API
router.put(
  "/update/:id",
  upload.fields([
    { name: "company_logo", maxCount: 1 },
    { name: "pdf_header_logo", maxCount: 1 },
  ]),
  settingUpdate
);

// Export the router
export default router;
