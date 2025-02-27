import connection from "../index.js";

// Add Skills
export const SkillsAdd = async (req, res) => {
  try {
    const { skills } = req.body;

    const checkQuery = "SELECT * FROM skills WHERE skills = ?";
    const [existingSkills] = await connection.query(checkQuery, [
        skills,
    ]);

    if (existingSkills.length > 0) {
      return res.status(400).json({ error: "Skill already exists" });
    }

    const insertQuery =
      "INSERT INTO skills (skills) VALUES (?)";
    const values = [skills];

    const [results] = await connection.query(insertQuery, values);

    res.status(201).json({ message: "Skill created successfully" });
  } catch (error) {
    console.error("Error adding skills:", error);
    res.status(500).json({ error: "Failed to add skills" });
  }
};

// Get Skills
export const skillsView = async (req, res) => {
  try {
    const query = "SELECT * FROM skills ORDER BY skills";
    const [results] = await connection.query(query);

    res.status(200).json(results);
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error retrieving skills:", error);
    res.status(500).json({ error: "Failed to retrieve skills" });
  }
};

// Update Skills
export const skillsUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { skills } = req.body;

    const checkQuery = "SELECT * FROM skills WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "Skill not found" });
    }

    const updateQuery =
      "UPDATE skills SET skills = ? WHERE id = ?";
    await connection.query(updateQuery, [skills, id]);

    // Return a success response
    res.status(200).json({ message: "Skill updated successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error updating skills:", error);
    res.status(500).json({ error: "Failed to update skills" });
  }
};

// Delete Skills
export const skillsDelete = async (req, res) => {
  try {
    const { id } = req.params; 

    const checkQuery = "SELECT * FROM skills WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "Skill not found" });
    }

    const deleteQuery = "DELETE FROM skills WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    // Return a success response
    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error deleting skills:", error);
    res.status(500).json({ error: "Failed to delete skills" });
  }
};
