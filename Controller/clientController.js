import connection from "../index.js";

// GET || API
export const clientView = async (req, res) => {
  try {
    const query = "SELECT * FROM client ORDER BY clientName";
    const [result] = await connection.query(query);
    res.status(200).json({ result });
  } catch (error) {
    console.error("Error retrieving client:", error);
    res.status(500).json({ error: "Failed to retrieve client" });
  }
};

// POST || API
export const clientAdd = async (req, res) => {
  try {
    const { clientName, email, rate } = req.body;

    const checkQuery = "SELECT * FROM client WHERE email = ?";
    const [existingClient] = await connection.query(checkQuery, [email]);

    if (existingClient.length > 0) {
      return res
        .status(400)
        .json({ error: "Client already exists with this email" });
    }

    const insertQuery =
      "INSERT INTO client (clientName, email, rate) VALUES (?, ?, ?)";
    const values = [clientName, email, rate];

    const [result] = await connection.query(insertQuery, values);
    res.status(201).json({ message: "Client created successfully", result });
  } catch (error) {
    console.error("Error while adding client:", error);
    res.status(500).json({ error: "Failed to add client" });
  }
};

// PUT || API
export const clientEdit = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, email, rate } = req.body;

    // Check if the client exists in the database
    const checkQuery = "SELECT * FROM client WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "client not found" });
    }

    const emailCheckQuery = "SELECT * FROM client WHERE email = ? AND id != ?";
    const [existingClient] = await connection.query(emailCheckQuery, [
      email,
      id,
    ]);

    if (existingClient.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Update the client in the database
    const updateQuery =
      "UPDATE client SET clientName = ?, email = ?, rate = ?  WHERE id = ?";
    await connection.query(updateQuery, [clientName, email, rate, id]);

    res.status(200).json({ message: "client updated successfully" });
  } catch (error) {
    console.error("Error while add client:", error);
    res.status(500).json({ error: "Failed to Add client" });
  }
};

// DELETE || API
export const clientDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = "SELECT * FROM client WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ message: "Client Not Found" });
    }

    const deleteQuery = "DELETE FROM client WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    // Return a success response
    res.status(200).json({ message: "client deleted successfully" });
  } catch (error) {
    console.error("Error deleting tasks:", error);
    res.status(500).json({ error: "Failed to delete tasks" });
  }
};
