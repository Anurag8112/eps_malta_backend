import connection from "../../index.js";

// GET || API
export const getCompanies = async (req, res) => {
  try {
    let query = "SELECT * FROM companies";
    const filters = [];

    if (req.query.name) {
      filters.push(`name LIKE '%${req.query.name}%'`);
    }

    if (req.query.status) {
      filters.push(`status = '${req.query.status}'`);
    }

    // If there are filters, add a WHERE clause to the query
    if (filters.length > 0) {
      query += ` WHERE ${filters.join(" AND ")}`;
    }

    const [result] = await connection.query(query);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve Data" });
  }
};

// POST || API
export const addCompanies = async (req, res) => {
  try {
    const { name, email, mobile, address, domain, status } = req.body;

    const query =
      "INSERT INTO companies (name, email, mobile, address, domain, status) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [name, email, mobile, address, domain, status];

    const [result] = await connection.query(query, values);

    const newData = { name, email, mobile, address, domain, status };
    res.status(201).json({ message: "Companies added successfully", newData });
  } catch (error) {
    console.error("Error adding Companies :", error);
    res.status(500).json({ error: "Failed to add Companies" });
  }
};

// // PUT || API
export const editCompanies = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, address, domain, status } = req.body;

    // Update the license type in the database
    const updateQuery =
      "UPDATE companies SET name = ?, email = ?, mobile = ?, address = ?, domain = ?, status = ?  WHERE id = ?";
    await connection.query(updateQuery, [
      name,
      email,
      mobile,
      address,
      domain,
      status,
      id,
    ]);

    res.status(200).json({ message: "Companies updated successfully" });
  } catch (error) {
    console.error("Error editing Companies:", error);
    res.status(500).json({ error: "Failed to edit Companies" });
  }
};

// DELETE || API
export const deleteCompanies = async (req, res) => {
  try {
    const { id } = req.params;
    const checkQuery = "SELECT * FROM companies WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res
        .status(404)
        .json({ message: "This license type is not found" });
    }
    const deleteQuery = "DELETE FROM companies WHERE id = ?";
    await connection.query(deleteQuery, [id]);
    res.status(200).json({ message: "Companies deleted successfully" });
  } catch (error) {
    console.error("Error deleting companies:", error);
    res.status(500).json({ error: "Failed to delete companies" });
  }
};
