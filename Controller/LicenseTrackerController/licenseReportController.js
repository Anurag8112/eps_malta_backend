import connection from "../../index.js";

// GET || API
export const getReport = async (req, res) => {
  try {
    const {
      page,
      limit,
      search = "",
      year,
      month,
      status,
      paid,
      category,
      types,
    } = req.query;

    // Build the SQL query based on the search and filter parameters
    let query = `
    SELECT DISTINCT forms.formName as categoryType, tracker_archive.*, users.username
    FROM tracker_archive
    INNER JOIN users ON tracker_archive.employeeId = users.id
    INNER JOIN forms ON tracker_archive.category = forms.type
    WHERE 1=1
  `;
    const queryParams = [];

    if (search) {
      query += " AND employeeId LIKE ?";
      queryParams.push(`%${search}%`);
    }

    if (year) {
      query += " AND year = ?";
      queryParams.push(Number(year));
    }

    if (month) {
      query += " AND month = ?";
      queryParams.push(Number(month));
    }

    if (status) {
      query += " AND status = ?";
      queryParams.push(status);
    }

    if (paid) {
      query += " AND paid = ?";
      queryParams.push(paid);
    }

    if (category) {
      query += " AND category = ?";
      queryParams.push(category);
    }

    if (types) {
      query += " AND types = ?";
      queryParams.push(types);
    }

    if (page && limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += " LIMIT ? OFFSET ?";
      queryParams.push(parseInt(limit), offset);
    }

    // Add ORDER BY clause to order the results in descending order by id
    query += " ORDER BY tracker_id DESC";

    const [result] = await connection.query(query, queryParams);

    const totalCountQuery =
      "SELECT COUNT(*) as count FROM tracker_archive WHERE 1=1";
    const [totalCountResult] = await connection.query(
      totalCountQuery,
      queryParams
    );
    const totalCount = totalCountResult[0].count;

    const response = {
      data: result,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / limit),
      currentPageData: result.length,
      totalData: totalCount,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve report data" });
  }
};

// POST || API
export const addReport = async (req, res) => {
  try {
    const {
      category,
      employeeId,
      email,
      phone_number,
      types,
      ref_number,
      start_date,
      paid,
      no_of_month,
      notes,
    } = req.body;
    const receipt = req.file.path;

    // Validate the required fields
    if (
      !category ||
      !employeeId ||
      !email ||
      !phone_number ||
      !types ||
      !ref_number ||
      !start_date ||
      !paid ||
      !no_of_month ||
      !notes
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Extract the year, month, and day from the start_date
    const startDate = new Date(start_date);
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1; // Adding 1 to match the expected month format
    // const day = startDate.getDate();

    // Calculate the expiration date
    const expirationDate = new Date(startDate);
    expirationDate.setMonth(expirationDate.getMonth() + parseInt(no_of_month)); // Add the number of months
    const expYear = expirationDate.getFullYear();
    const expMonth = expirationDate.getMonth() + 1; // Adding 1 to match the expected month format
    const expDay = expirationDate.getDate();

    // Format the expiration date as yyyy-mm-dd
    const formattedExpDate = `${expYear}-${expMonth
      .toString()
      .padStart(2, "0")}-${expDay.toString().padStart(2, "0")}`;

    // Insert the new report entry into the database
    const query = `
      INSERT INTO tracker_archive (category, employeeId, email, phone_number, types, ref_number, start_date, year, month, paid, receipt, no_of_month, notes, exp_date, exp_month, exp_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const queryParams = [
      category,
      employeeId,
      email,
      phone_number,
      types,
      ref_number,
      start_date,
      year,
      month,
      paid,
      receipt,
      no_of_month,
      notes,
      formattedExpDate,
      expMonth,
      expYear,
    ];
    await connection.query(query, queryParams);

    res.status(201).json({ message: "Report data added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add report data" });
  }
};

// PUT || API
export const editReport = async (req, res) => {
  try {
    const reportId = req.params.id;

    const {
      category,
      employeeId,
      email,
      phone_number,
      types,
      ref_number,
      start_date,
      paid,
      no_of_month,
      notes,
    } = req.body;

    // Optional: Validate the required fields in the updated data
    if (
      !category ||
      !employeeId ||
      !email ||
      !phone_number ||
      !types ||
      !ref_number ||
      !start_date ||
      !paid ||
      !no_of_month ||
      !notes
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Extract the year, month, and day from the start_date
    const startDate = new Date(start_date);
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1; // Adding 1 to match the expected month format

    // Calculate the expiration date
    const expirationDate = new Date(startDate);
    expirationDate.setMonth(expirationDate.getMonth() + parseInt(no_of_month)); // Add the number of months
    const expYear = expirationDate.getFullYear();
    const expMonth = expirationDate.getMonth() + 1; // Adding 1 to match the expected month format
    const expDay = expirationDate.getDate();

    // Format the expiration date as yyyy-mm-dd
    const formattedExpDate = `${expYear}-${expMonth
      .toString()
      .padStart(2, "0")}-${expDay.toString().padStart(2, "0")}`;

    // Check if a new image is being provided
    let receipt = req.file ? req.file.path : null;

    // Build the update query
    let updateQuery = `
      UPDATE tracker_archive
      SET category=?, employeeId=?, email=?, phone_number=?, types=?, ref_number=?, start_date=?, year=?, month=?, paid=?, no_of_month=?, notes=?, exp_date=?, exp_month=?, exp_year=?
    `;

    // Include the receipt field in the query if a new image is provided
    if (receipt) {
      updateQuery += `, receipt=?`;
    }

    updateQuery += ` WHERE tracker_id=?`;

    let updateParams = [
      category,
      employeeId,
      email,
      phone_number,
      types,
      ref_number,
      start_date,
      year,
      month,
      paid,
      no_of_month,
      notes,
      formattedExpDate,
      expMonth,
      expYear,
    ];

    if (receipt) {
      updateParams.push(receipt);
    }

    updateParams.push(reportId);

    // Execute the update query
    await connection.query(updateQuery, updateParams);

    res.status(200).json({ message: "Report data updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update report data" });
  }
};

// DELETE || API
export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM tracker_archive WHERE tracker_id = ?";
    await connection.execute(query, [id]);

    res.status(200).json({ message: "License deleted successfully" });
  } catch (error) {
    console.error("Error deleting license:", error);
    res.status(500).json({ error: "Failed to delete license" });
  }
};

// GET || API
export const licenseDetails = async (req, res) => {
  try {
    const query = "SELECT DISTINCT year FROM tracker_archive ORDER BY year ASC";
    const [results] = await connection.query(query);

    // Return the eventss as the response
    res.status(200).json(results);
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error retrieving eventss:", error);
    res.status(500).json({ error: "Failed to retrieve eventss" });
  }
};
