import connection from "../index.js";

// Add Language
export const languageAdd = async (req, res) => {
  try {
    const { languages } = req.body;

    const checkQuery = "SELECT * FROM languages WHERE languages = ?";
    const [existingLanguage] = await connection.query(checkQuery, [languages]);

    if (existingLanguage.length > 0) {
      return res.status(400).json({ error: "Language already exists" });
    }

    const insertQuery = "INSERT INTO languages (languages) VALUES (?)";
    const values = [languages];

    const [results] = await connection.query(insertQuery, values);

    res.status(201).json({ message: "Language created successfully" });
  } catch (error) {
    console.error("Error adding languages:", error);
    res.status(500).json({ error: "Failed to add languages" });
  }
};

// Get Language
export const languageView = async (req, res) => {
  try {
    const query = "SELECT * FROM languages ORDER BY languages";
    const [results] = await connection.query(query);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error retrieving languages:", error);
    res.status(500).json({ error: "Failed to retrieve languages" });
  }
};

// Update Language
export const languageUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { languages } = req.body;

    const checkQuery = "SELECT * FROM languages WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "Language not found" });
    }

    const updateQuery =
      "UPDATE languages SET languages = ? WHERE id = ?";
    await connection.query(updateQuery, [languages, id]);

    res.status(200).json({ message: "Language updated successfully" });
  } catch (error) {
    console.error("Error updating languages:", error);
    res.status(500).json({ error: "Failed to update languages" });
  }
};

// Delete Language
export const languageDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = "SELECT * FROM languages WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "Language not found" });
    }

    const deleteQuery = "DELETE FROM languages WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    res.status(200).json({ message: "Language deleted successfully" });
  } catch (error) {
    console.error("Error deleting languages:", error);
    res.status(500).json({ error: "Failed to delete languages" });
  }
};
