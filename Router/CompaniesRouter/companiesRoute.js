import express from "express";
import {
  getCompanies,
  addCompanies,
  editCompanies,
  deleteCompanies,
} from "../../Controller/CompaniesController/companiesController.js";

const router = express.Router();

// GET || ROUTER
router.get("/view", getCompanies);

// POST || ROUTER
router.post("/add", addCompanies);

// // PUT || ROUTER
router.put("/edit/:id", editCompanies);

// DELETE || ROUTER
router.delete("/delete/:id", deleteCompanies);

// Export the router
export default router;
