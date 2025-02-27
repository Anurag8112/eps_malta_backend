import connection from "../index.js";

// Add Location
export const locationAdd = async (req, res) => {
  try {
    // Extract the location and description fields from the request body
    const { location, description, rate } = req.body;

    // Check if the location already exists in the database
    const checkQuery = "SELECT * FROM location WHERE location = ?";
    const [existingLocation] = await connection.query(checkQuery, [location]);

    if (existingLocation.length > 0) {
      return res.status(400).json({ error: "Location already exists" });
    }

    const insertQuery =
      "INSERT INTO location (location, description,rate) VALUES (?, ?, ?)";
    const values = [location, description, rate];

    const [results] = await connection.query(insertQuery, values);

    const newLocation = { id: results.insertId, location, description, rate };
    res
      .status(201)
      .json({ message: "Location created successfully", newLocation });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error adding location:", error);
    res.status(500).json({ error: "Failed to add location" });
  }
};

// Get Locations
export const locationView = async (req, res) => {
  try {
    // Retrieve all locations from the database
    const query = "SELECT * FROM location ORDER BY location";
    const [results] = await connection.query(query);

    // Return the locations as the response
    res.status(200).json(results);
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error retrieving locations:", error);
    res.status(500).json({ error: "Failed to retrieve locations" });
  }
};

// Update Location
export const locationUpdate = async (req, res) => {
  try {
    const { id } = req.params; // Extract the location ID from the request parameters
    const { location, description, rate } = req.body; // Extract the updated location and description from the request body

    // Check if the location exists in the database
    const checkQuery = "SELECT * FROM location WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      // If no location is found with the specified ID, return a 404 error
      return res.status(404).json({ error: "Location not found" });
    }

    // Update the location in the database
    const updateQuery =
      "UPDATE location SET location = ?, description = ?, rate = ? WHERE id = ?";
    await connection.query(updateQuery, [location, description, rate, id]);

    // Return a success response
    res.status(200).json({ message: "Location updated successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
};

// Delete Location
export const locationDelete = async (req, res) => {
  try {
    const { id } = req.params; // Extract the location ID from the request parameters

    // Check if the location exists in the database
    const checkQuery = "SELECT * FROM location WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      // If no location is found with the specified ID, return a 404 error
      return res.status(404).json({ error: "Location not found" });
    }

    // Delete the location from the database
    const deleteQuery = "DELETE FROM location WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    // Return a success response
    res.status(200).json({ message: "Location deleted successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error deleting location:", error);
    res.status(500).json({ error: "Failed to delete location" });
  }
};
