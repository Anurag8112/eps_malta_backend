import connection from "../index.js";

// Add events
export const eventsAdd = async (req, res) => {
  try {
    // Extract the events and description fields from the request body
    const { events, description, eventColor } = req.body;

    const checkQuery = "SELECT * FROM events WHERE events = ?";
    const [existingEvents] = await connection.query(checkQuery, [events]);

    if (existingEvents.length > 0) {
      return res.status(400).json({ error: "Events already exist" });
    }

    const insertQuery =
      "INSERT INTO events (events, description , eventColor) VALUES (?, ?, ?)";
    const values = [events, description, eventColor];

    const [results] = await connection.query(insertQuery, values);

    const newEvents = { id: results.insertId, events, description };
    res.status(201).json({ message: "Events created successfully", newEvents });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error adding events:", error);
    res.status(500).json({ error: "Failed to add events" });
  }
};

// Get eventss
export const eventsView = async (req, res) => {
  try {
    // Retrieve all eventss from the database
    const query = "SELECT * FROM events ORDER BY events";
    const [results] = await connection.query(query);

    // Return the eventss as the response
    res.status(200).json(results);
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error retrieving eventss:", error);
    res.status(500).json({ error: "Failed to retrieve eventss" });
  }
};

// Update events
export const eventsUpdate = async (req, res) => {
  try {
    const { id } = req.params; // Extract the events ID from the request parameters
    const { events, description, eventColor } = req.body; // Extract the updated events and description from the request body

    // Check if the events exists in the database
    const checkQuery = "SELECT * FROM events WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      // If no events is found with the specified ID, return a 404 error
      return res.status(404).json({ error: "events not found" });
    }

    // Update the events in the database
    const updateQuery =
      "UPDATE events SET events = ?, description = ?, eventColor = ? WHERE id = ?";
    await connection.query(updateQuery, [events, description, eventColor, id]);

    // Return a success response
    res.status(200).json({ message: "events updated successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error updating events:", error);
    res.status(500).json({ error: "Failed to update events" });
  }
};

// Delete events
export const eventsDelete = async (req, res) => {
  try {
    const { id } = req.params; // Extract the events ID from the request parameters

    // Check if the events exists in the database
    const checkQuery = "SELECT * FROM events WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      // If no events is found with the specified ID, return a 404 error
      return res.status(404).json({ error: "events not found" });
    }

    // Delete the events from the database
    const deleteQuery = "DELETE FROM events WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    // Return a success response
    res.status(200).json({ message: "events deleted successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error deleting events:", error);
    res.status(500).json({ error: "Failed to delete events" });
  }
};
