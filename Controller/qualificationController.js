import connection from "../index.js";

// Add Qualifications
export const qualificationsAdd = async (req, res) => {
  try {
    const { qualifications } = req.body;

    const checkQuery = "SELECT * FROM qualifications WHERE qualifications = ?";
    const [existingQualifications] = await connection.query(checkQuery, [
      qualifications,
    ]);

    if (existingQualifications.length > 0) {
      return res.status(400).json({ error: "Qualification already exists" });
    }

    const insertQuery =
      "INSERT INTO qualifications (qualifications) VALUES (?)";
    const values = [qualifications];

    const [results] = await connection.query(insertQuery, values);

    res.status(201).json({ message: "Qualification created successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error adding qualification:", error);
    res.status(500).json({ error: "Failed to add qualification" });
  }
};

// Get Qualifications
export const qualificationsView = async (req, res) => {
  try {
    // Retrieve all locations from the database
    const query = "SELECT * FROM qualifications ORDER BY qualifications";
    const [results] = await connection.query(query);

    // Return the qualifications as the response
    res.status(200).json(results);
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error retrieving qualifications:", error);
    res.status(500).json({ error: "Failed to retrieve qualifications" });
  }
};

// Update Qualifications
export const qualificationsUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { qualifications } = req.body;

    // Check if the qualifications exists in the database
    const checkQuery = "SELECT * FROM qualifications WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      // If no qualifications is found with the specified ID, return a 404 error
      return res.status(404).json({ error: "Qualification not found" });
    }

    // Update the qualifications in the database
    const updateQuery =
      "UPDATE qualifications SET qualifications = ? WHERE id = ?";
    await connection.query(updateQuery, [qualifications, id]);

    // Return a success response
    res.status(200).json({ message: "Qualification updated successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error updating qualifications:", error);
    res.status(500).json({ error: "Failed to update qualifications" });
  }
};

// Delete Qualifications
export const qualificationsDelete = async (req, res) => {
  try {
    const { id } = req.params; // Extract the location ID from the request parameters

    // Check if the Qualifications exists in the database
    const checkQuery = "SELECT * FROM qualifications WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      // If no qualification is found with the specified ID, return a 404 error
      return res.status(404).json({ error: "Qualification not found" });
    }

    // Delete the qualification from the database
    const deleteQuery = "DELETE FROM qualifications WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    // Return a success response
    res.status(200).json({ message: "Qualification deleted successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error deleting qualification:", error);
    res.status(500).json({ error: "Failed to delete qualification" });
  }
};
