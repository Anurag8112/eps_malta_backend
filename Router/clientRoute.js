// Import dependencies
import express from "express";
import {
  clientAdd,
  clientDelete,
  clientEdit,
  clientView,
} from "../Controller/clientController.js";

// Create an Express router
const router = express.Router();

// GET || API
router.get("/view", clientView);

// POST || API
router.post("/add", clientAdd);

// UPDATE || API
router.put("/update/:id", clientEdit);

// DELETE || API
router.delete("/delete/:id", clientDelete);

// Export the router
export default router;
