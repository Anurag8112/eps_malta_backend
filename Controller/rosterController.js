import connection from "../index.js";

// Get Skills
export const rosterView = async (req, res) => {
  try {
    const {
      date,
      employeeId,
      locationId,
      clientId,
      eventId,
      taskId,
      group,
      page = 1,
      perPage = 20,
    } = req.query;

    const offset = (page - 1) * perPage;

    // Base query with only the required fields
    let query = `
      SELECT 
        t.timesheet_id,
        t.employeeId,
        t.date,
        t.clientId,
        t.locationId,
        t.eventId,
        t.taskId,
        CONCAT(
          TIME_FORMAT(t.startTime, '%h:%i %p'), 
          ' - ', 
          TIME_FORMAT(t.endTime, '%h:%i %p')
        ) AS shiftTime,          
        u.username AS username, 
        l.location AS location, 
        e.events AS event, 
        e.eventColor AS eventColor, 
        tk.tasks AS task, 
        c.clientName AS client 
      FROM 
        timesheet t
        LEFT JOIN users u ON t.employeeId = u.id
        LEFT JOIN location l ON t.locationId = l.id
        LEFT JOIN events e ON t.eventId = e.id
        LEFT JOIN tasks tk ON t.taskId = tk.id
        LEFT JOIN client c ON t.clientId = c.id
    `;

    let countQuery = `
      SELECT COUNT(*) as totalRecords
      FROM 
        timesheet t
        LEFT JOIN users u ON t.employeeId = u.id
        LEFT JOIN location l ON t.locationId = l.id
        LEFT JOIN events e ON t.eventId = e.id
        LEFT JOIN tasks tk ON t.taskId = tk.id
        LEFT JOIN client c ON t.clientId = c.id
    `;

    // Initialize an array to hold the query conditions
    const conditions = [];

    // Add conditions based on the presence of query parameters
    if (date) {
      conditions.push(`t.date = ?`);
    }
    if (employeeId) {
      const employeeIds = Array.isArray(employeeId)
        ? employeeId
        : employeeId.split(",").map((id) => Number(id));
      conditions.push(
        `t.employeeId ${employeeIds.length > 1 ? "IN" : "="} (${employeeIds
          .map(() => "?")
          .join(",")})`
      );
    }
    if (locationId) {
      conditions.push(`t.locationId = ?`);
    }
    if (clientId) {
      conditions.push(`t.clientId = ?`);
    }
    if (eventId) {
      conditions.push(`t.eventId = ?`);
    }
    if (taskId) {
      conditions.push(`t.taskId = ?`);
    }

    // If there are any conditions, append them to the query
    if (conditions.length > 0) {
      const conditionString = conditions.join(" AND ");
      query += ` WHERE ${conditionString}`;
      countQuery += ` WHERE ${conditionString}`;
    }

    // Add ORDER BY clause to sort by start time
    query += ` ORDER BY t.startTime LIMIT ? OFFSET ?`;

    // Array to hold the values for the query parameters
    const queryParams = [];

    // Add the values for the query parameters in the same order as the conditions
    if (date) {
      queryParams.push(date);
    }
    if (employeeId) {
      const employeeIds = Array.isArray(employeeId)
        ? employeeId
        : employeeId.split(",").map((id) => Number(id));
      queryParams.push(...employeeIds);
    }
    if (locationId) {
      queryParams.push(locationId);
    }
    if (clientId) {
      queryParams.push(clientId);
    }
    if (eventId) {
      queryParams.push(eventId);
    }
    if (taskId) {
      queryParams.push(taskId);
    }

    queryParams.push(Number(perPage), Number(offset));

    // Execute the count query to get the total number of records
    const [countResult] = await connection.query(
      countQuery,
      queryParams.slice(0, -2)
    );
    const totalRecords = countResult[0].totalRecords;
    const totalPages = Math.ceil(totalRecords / perPage);

    // Execute the query with the parameters
    const [results] = await connection.query(query, queryParams);

    // Group results based on the specified 'group' parameter
    let groupedResults = results;

    if (group) {
      const groupedResultsMap = new Map();

      results.forEach((result) => {
        const key = result[group];
        if (!groupedResultsMap.has(key)) {
          groupedResultsMap.set(key, { [group]: key, result: [] });
        }
        groupedResultsMap.get(key).result.push(result);
      });

      groupedResults = [...groupedResultsMap.values()];
    }

    res.status(200).json({
      data: groupedResults,
      totalPages,
      currentPage: Number(page),
      perPage: Number(perPage),
      totalRecords,
    });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error retrieving roster:", error.stack);
    res.status(500).json({ error: "Failed to retrieve roster" });
  }
};
