import connection from "../../index.js";

// GET || API
export const emailTemplateView = async (req, res) => {
  try {
    const query = "SELECT * FROM email_template";
    const [results] = await connection.query(query);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error retrieving Email Template:", error);
    res.status(500).json({ error: "Failed to retrieve Email Template" });
  }
};

// ADD || API

export const emailTemplateAdd = async (req, res) => {
  try {
    const { type, subject, body } = req.body;
    console.log("first",req.body)

    // Check if an email template with the same type already exists
    const checkQuery = "SELECT * FROM email_template WHERE type = ?";
    const [existingEmailTemplate] = await connection.query(checkQuery, [type]);

    if (existingEmailTemplate.length > 0) {
      return res.status(400).json({ error: "Email Template already exists" });
    }

    // Insert the new email template
    const insertQuery =
      "INSERT INTO email_template (type, subject, body) VALUES (?, ?, ?)";
    const values = [type, subject, body];

    const [results] = await connection.query(insertQuery, values);

    res.status(201).json({ message: "Email Template created successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error adding Email Template:", error);
    res.status(500).json({ error: "Failed to add Email Template" });
  }
};

// PUT || API
export const emailTemplateEdit = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, subject, body } = req.body;

    const checkQuery = "SELECT * FROM email_template WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "Email template not found" });
    }

    const updateQuery =
      "UPDATE email_template SET type = ?, subject = ?, body = ? WHERE id = ?";
    await connection.query(updateQuery, [type, subject, body, id]);

    res.status(200).json({ message: "Email template updated successfully" });
  } catch (error) {
    console.error("Error updating Email template:", error);
    res.status(500).json({ error: "Failed to update Email template" });
  }
};

// DELETE || API
export const emailTemplateDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = "SELECT * FROM email_template WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "Email template not found" });
    }

    const deleteQuery = "DELETE FROM email_template WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    res.status(200).json({ message: "Email template deleted successfully" });
  } catch (error) {
    console.error("Error deleting Email template:", error);
    res.status(500).json({ error: "Failed to delete Email template" });
  }
};
