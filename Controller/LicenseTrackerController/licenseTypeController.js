import connection from "../../index.js";

// GET || API
export const getLicenseType = async (req, res) => {
  try {
    const query = "SELECT * FROM license_type";
    const [result] = await connection.query(query);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve Data" });
  }
};

// POST || API
export const addLicenseType = async (req, res) => {
  try {
    const { licenseType, description } = req.body;
    const query =
      "INSERT INTO license_type (licenseType, description) VALUES (?, ?)";
    const values = [licenseType, description];

    const [result] = await connection.query(query, values);

    const newData = { licenseType, description };
    res
      .status(201)
      .json({ message: "License Type Added Successfully", newData });
  } catch (error) {
    console.error("Error adding License Type:", error);
    res.status(500).json({ error: "Failed to add License Type" });
  }
};

// PUT || API
export const editLicenseType = async (req, res) => {
  try {
    const { id } = req.params;
    // Retrieve the new license type data from the request body
    const { licenseType, description } = req.body;

    // Update the license type in the database
    const updateQuery =
      "UPDATE license_type SET licenseType = ?, description = ? WHERE id = ?";
    await connection.query(updateQuery, [licenseType, description, id]);

    res.status(200).json({ message: "License Type updated successfully" });
  } catch (error) {
    console.error("Error editing License Type:", error);
    res.status(500).json({ error: "Failed to edit License Type" });
  }
};

// DELETE || API
export const deleteLicenseType = async (req, res) => {
  try {
    const { id } = req.params;
    const checkQuery = "SELECT * FROM license_type WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res
        .status(404)
        .json({ message: "This license type is not found" });
    }
    const deleteQuery = "DELETE FROM license_type WHERE id = ?";
    await connection.query(deleteQuery, [id]);
    res.status(200).json({ message: "License Type deleted successfully" });
  } catch (error) {
    console.error("Error deleting License Type:", error);
    res.status(500).json({ error: "Failed to delete License Type" });
  }
};