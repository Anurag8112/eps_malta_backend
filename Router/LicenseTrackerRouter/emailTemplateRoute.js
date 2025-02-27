import express from "express";
import {
  emailTemplateAdd,
  emailTemplateDelete,
  emailTemplateEdit,
  emailTemplateView,
} from "../../Controller/LicenseTrackerController/emailTemplateController.js";

const router = express.Router();

// GET || API
router.get("/view", emailTemplateView);

// POST || API
router.post("/add", emailTemplateAdd);

// // UPDATE || API
router.put("/update/:id", emailTemplateEdit);

// // DELETE || API
router.delete("/delete/:id", emailTemplateDelete);

// Export the router
export default router;
