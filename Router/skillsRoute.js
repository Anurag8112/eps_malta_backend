// Import dependencies
import express from "express";
import {
  SkillsAdd,
  skillsDelete,
  skillsUpdate,
  skillsView,
} from "../Controller/skillsController.js";

// Create an Express router
const router = express.Router();

// skills Add Route
router.post("/add", SkillsAdd);

// All skills GET Route
router.get("/view", skillsView);

// skills Update Route
router.put("/update/:id", skillsUpdate);

// skills delete
router.delete("/delete/:id", skillsDelete);

// Export the router
export default router;
