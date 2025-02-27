// Import dependencies
import express from "express";
import {
  employeeDelete,
  employeeDetails,
  employeeDetailsAdd,
  employeeView,
  employeeReport,
  searchEmployee,
  employeeDetailsUpdate,
  clientReport,
  filterEmployeeDetails,
  clientSummaryReport,
  logActionView,
  updateInvoices,
  addFromExcel,
  excelTemplateDownload,
  notificationSend,
} from "../Controller/timeSheetController.js";
import multer from "multer";

// Create an Express router
const router = express.Router();

// Define the storage location and filename format for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/file/"); // Define the storage directory
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/:/g, "-"); // Define the filename format
    cb(null, `${timestamp}-${file.originalname}`);
  },
});

// Define the Multer middleware with the storage option
const upload = multer({ storage: storage });

//Search Employee Route
router.get("/employee", searchEmployee);

// Timesheet log
router.get("/log/details", logActionView);

// Location , Events , Tasks Route
router.get("/employee/details", employeeDetails);

router.get("/filter/employee/details", filterEmployeeDetails);

// Employee Entry Post Route
router.post("/employee/entryadd", employeeDetailsAdd);

// Employee Entry from Excel Route
router.post("/employee/addfromexcel", upload.single("file"), addFromExcel); // 'excelFile' is the name attribute in your form

// Employee Entry Put Route
router.put("/employee/entryupdate/:id", employeeDetailsUpdate);

// Employee invoiced Put Route
router.put("/employee/update/invoiced", updateInvoices);

// Employee Entry Get Route
router.get("/employee/entryview", employeeView);

// Employee Entry Delete Route
router.delete("/employee/entrydelete/:id", employeeDelete);

// Employee Report GET
router.get("/employee/report", employeeReport);

// Employee Report GET in PDF
router.get("/employee/report-pdf", employeeReport);

// Employee Report GET in excel
router.get("/employee/report-excel", employeeReport);

// Import Excel Template download
router.get("/employee/report-excel/template", excelTemplateDownload);

// Client Report GET
router.get("/client/report", clientReport);

// Client Report GET in PDF
router.get("/client/report-pdf", clientReport);

// Client Summary Report GET in PDF
router.get("/client/summary/report", clientSummaryReport);

// Whataap Notifactions send
router.post("/notifications/send", notificationSend);

// Export the router
export default router;
