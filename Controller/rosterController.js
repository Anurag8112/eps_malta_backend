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
    const queryParams = [];

    if (date) {
      conditions.push(`t.date = ?`);
      queryParams.push(date);
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
      queryParams.push(...employeeIds);
    }

    if (locationId) {
      const locationIds = Array.isArray(locationId)
        ? locationId
        : locationId.split(",").map((id) => Number(id));
      conditions.push(
        `t.locationId ${locationIds.length > 1 ? "IN" : "="} (${locationIds
          .map(() => "?")
          .join(",")})`
      );
      queryParams.push(...locationIds);
    }

    if (clientId) {
      conditions.push(`t.clientId = ?`);
      queryParams.push(clientId);
    }

    if (eventId) {
      conditions.push(`t.eventId = ?`);
      queryParams.push(eventId);
    }

    if (taskId) {
      conditions.push(`t.taskId = ?`);
      queryParams.push(taskId);
    }

    if (conditions.length > 0) {
      const conditionString = conditions.join(" AND ");
      query += ` WHERE ${conditionString}`;
      countQuery += ` WHERE ${conditionString}`;
    }

    // Add ORDER BY clause and pagination
    query += ` ORDER BY t.startTime LIMIT ? OFFSET ?`;
    queryParams.push(Number(perPage), Number(offset));

    // Execute count query
    const [countResult] = await connection.query(
      countQuery,
      queryParams.slice(0, -2)
    );
    const totalRecords = countResult[0].totalRecords;
    const totalPages = Math.ceil(totalRecords / perPage);

    // Execute data query
    const [results] = await connection.query(query, queryParams);

    // Group if needed
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
    console.error("Error retrieving roster:", error.stack);
    res.status(500).json({ error: "Failed to retrieve roster" });
  }
};

