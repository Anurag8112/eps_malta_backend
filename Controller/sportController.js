import connection from "../index.js";

// Add Sports
export const Sportsadd = async (req, res) => {
  try {
    const { sports } = req.body;

    const checkQuery = "SELECT * FROM sports WHERE sports = ?";
    const [existingSports] = await connection.query(checkQuery, [sports]);

    if (existingSports.length > 0) {
      return res.status(400).json({ error: "Sport already exists" });
    }

    const insertQuery = "INSERT INTO sports (sports) VALUES (?)";
    const values = [sports];

    const [results] = await connection.query(insertQuery, values);

    res.status(201).json({ message: "Sport created successfully" });
  } catch (error) {
    console.error("Error adding sports:", error);
    res.status(500).json({ error: "Failed to add sports" });
  }
};

// Get Sports
export const SportsView = async (req, res) => {
  try {
    const query = "SELECT * FROM sports ORDER BY id DESC";
    const [results] = await connection.query(query);

    res.status(200).json(results);
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error retrieving sports:", error);
    res.status(500).json({ error: "Failed to retrieve sports" });
  }
};

// Update Sports
export const SportsUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { sports } = req.body;

    const checkQuery = "SELECT * FROM sports WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "Sport not found" });
    }

    const updateQuery = "UPDATE sports SET sports = ? WHERE id = ?";
    await connection.query(updateQuery, [sports, id]);

    // Return a success response
    res.status(200).json({ message: "Sport updated successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error updating sports:", error);
    res.status(500).json({ error: "Failed to update sports" });
  }
};

// Delete Sports
export const SportsDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = "SELECT * FROM sports WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "Sport not found" });
    }

    const deleteQuery = "DELETE FROM sports WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    // Return a success response
    res.status(200).json({ message: "Sport deleted successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error deleting sports:", error);
    res.status(500).json({ error: "Failed to delete sports" });
  }
};
