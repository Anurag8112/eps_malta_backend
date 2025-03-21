import moment from "moment";
import connection from "../index.js";
import { clientPdfGenerate, generatePdfFromData } from "../Service/report.js";
import archiver from "archiver";
import ExcelJS from "exceljs";
import {
  generateExcelFromData,
  generateExcelFromTemplate,
} from "../Service/excelGenerator.js";
import dotenv from "dotenv";
import { sendMail } from "../Service/SendMail.js";
import { whatsappScheduler } from "../Scheduler/whatsappScheduler.js";

dotenv.config();

// Serach Employee
export const searchEmployee = async (req, res) => {
  try {
    const { username } = req.query;

    // Prepare the query with parameterized query
    let query =
      "SELECT username, id FROM users WHERE username LIKE ? AND status = '1'";
    const parameters = [`%${username}%`];

    // Execute the search query with parameterized query
    const [results] = await connection.execute(query, parameters);

    // Extract usernames and ids from the results and sort alphabetically
    const employees = results
      .map((result) => ({
        username: result.username,
        id: result.id,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));

    // Return the employees as a JSON response
    res.json(employees);
  } catch (error) {
    // Handle any errors that occur during the search
    console.error("Error searching employees:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Location, Events, Tasks, Client, Title GET API
export const employeeDetails = async (req, res) => {
  try {
    // Prepare the queries to fetch specific columns along with IDs from each table
    const queries = [
      connection.query(`SELECT id, location FROM location ORDER BY location`),
      connection.query(`SELECT id, tasks FROM tasks ORDER BY tasks`),
      connection.query(`SELECT id, events FROM events ORDER BY events`),
      connection.query(`SELECT id, clientName FROM client ORDER BY clientName`),
      connection.query(
        `SELECT id, rate_cap FROM app_setting ORDER BY rate_cap`
      ),
    ];

    // Execute the queries in parallel
    const [result1, result2, result3, result4, result5] = await Promise.all(
      queries
    );

    // Extract the required columns along with IDs from each result and sort alphabetically
    const locations = result1[0]
      .map((row) => ({
        id: row.id,
        location: row.location,
      }))
      .sort((a, b) => a.location.localeCompare(b.location));
    const tasks = result2[0]
      .map((row) => ({
        id: row.id,
        tasks: row.tasks,
      }))
      .sort((a, b) => a.tasks.localeCompare(b.tasks));
    const events = result3[0]
      .map((row) => ({
        id: row.id,
        events: row.events,
      }))
      .sort((a, b) => a.events.localeCompare(b.events));
    const client = result4[0]
      .map((row) => ({
        id: row.id,
        client: row.clientName,
      }))
      .sort((a, b) => a.client.localeCompare(b.client));
    const rate_cap = result5[0]
      .map((row) => ({
        id: row.id,
        rateCap: row.rate_cap,
      }))
      .sort((a, b) => a.rateCap - b.rateCap);

    // Combine the data into a single response object
    const data = {
      locations,
      tasks,
      events,
      client,
      rate_cap,
    };
    // Return the data as a JSON response
    res.json(data);
  } catch (error) {
    console.error("Error retrieving employee details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Filter API GET
export const filterEmployeeDetails = async (req, res) => {
  try {
    const {
      locationId,
      taskId,
      eventId,
      clientId,
      year,
      month,
      employeeId,
      ratePerHour,
      date,
    } = req.query;

    let filterConditions = [];
    let filterValues = [];

    if (locationId) {
      filterConditions.push("t.locationId = ?");
      filterValues.push(parseInt(locationId));
    }
    if (taskId) {
      filterConditions.push("t.taskId = ?");
      filterValues.push(parseInt(taskId));
    }
    if (eventId) {
      filterConditions.push("t.eventId = ?");
      filterValues.push(parseInt(eventId));
    }
    if (clientId) {
      filterConditions.push("t.clientId = ?");
      filterValues.push(parseInt(clientId));
    }
    if (year) {
      filterConditions.push("t.year = ?");
      filterValues.push(parseInt(year));
    }
    if (month) {
      filterConditions.push("t.month = ?");
      filterValues.push(month);
    }
    if (employeeId) {
      const employeeIds = Array.isArray(employeeId)
        ? employeeId
        : employeeId.split(",");
      const idPlaceholders = employeeIds.map(() => "?").join(", ");
      filterConditions.push(`t.employeeId IN (${idPlaceholders})`);
      filterValues.push(...employeeIds.map((id) => parseInt(id)));
    }
    if (ratePerHour) {
      const ratePerHours = Array.isArray(ratePerHour)
        ? ratePerHour
        : ratePerHour.split(",");
      const idPlaceholders = ratePerHours.map(() => "?").join(", ");
      filterConditions.push(`t.ratePerHour IN (${idPlaceholders})`);
      filterValues.push(...ratePerHours.map((rate) => parseFloat(rate)));
    }
    if (date) {
      filterConditions.push("t.date = ?");
      filterValues.push(date);
    }

    const filterQuery = filterConditions.length
      ? `WHERE ${filterConditions.join(" AND ")}`
      : "";

    const timesheetIdsQuery = await connection.query(
      `SELECT DISTINCT timesheet_id FROM timesheet t ${filterQuery}`,
      filterValues
    );

    const timesheetIds = timesheetIdsQuery[0].map((row) => row.timesheet_id);

    if (timesheetIds.length === 0) {
      const yearsResult = await connection.query(
        `SELECT DISTINCT year FROM timesheet ORDER BY year DESC`
      );
      const monthsResult = await connection.query(
        `SELECT DISTINCT month FROM timesheet ORDER BY FIELD(month, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')`
      );

      const titleResult = await connection.query(
        `SELECT id, title, type FROM template`
      );

      return res.json({
        locations: [],
        tasks: [],
        events: [],
        client: [],
        employee: [],
        ratePerHour: [],
        year: yearsResult[0].map((row) => ({ year: row.year })),
        month: monthsResult[0].map((row) => ({ month: row.month })),
        title: titleResult[0].map((row) => ({
          id: row.id,
          title: row.title,
          type: row.type,
        })),
      });
    }

    const queries = [
      connection.query(
        `SELECT DISTINCT l.id, l.location 
        FROM location l
        INNER JOIN timesheet t ON l.id = t.locationId
        WHERE t.timesheet_id IN (?)`,
        [timesheetIds]
      ),
      connection.query(
        `SELECT DISTINCT ta.id, ta.tasks 
        FROM tasks ta
        INNER JOIN timesheet t ON ta.id = t.taskId
        WHERE t.timesheet_id IN (?)`,
        [timesheetIds]
      ),
      connection.query(
        `SELECT DISTINCT e.id, e.events 
        FROM events e
        INNER JOIN timesheet t ON e.id = t.eventId
        WHERE t.timesheet_id IN (?)`,
        [timesheetIds]
      ),
      connection.query(
        `SELECT DISTINCT c.id, c.clientName 
        FROM client c
        INNER JOIN timesheet t ON c.id = t.clientId
        WHERE t.timesheet_id IN (?)`,
        [timesheetIds]
      ),
      connection.query(
        `SELECT DISTINCT year FROM timesheet ORDER BY year DESC`
      ),
      connection.query(`SELECT id, title, type FROM template`),
      connection.query(
        `SELECT DISTINCT month FROM timesheet ORDER BY FIELD(month, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')`
      ),
      connection.query(
        `SELECT DISTINCT u.id, u.username
        FROM users u
        INNER JOIN timesheet t ON u.id = t.employeeId
        WHERE t.timesheet_id IN (?)`,
        [timesheetIds]
      ),
      connection.query(
        `SELECT DISTINCT ratePerHour FROM timesheet WHERE timesheet_id IN (?) ORDER BY ratePerHour ASC`,
        [timesheetIds]
      ),
    ];

    const [
      result1,
      result2,
      result3,
      result4,
      result5,
      result6,
      result7,
      result8,
      result9,
    ] = await Promise.all(queries);

    const locations = result1[0].map((row) => ({
      id: row.id,
      location: row.location,
    }));
    const tasks = result2[0].map((row) => ({
      id: row.id,
      tasks: row.tasks,
    }));
    const events = result3[0].map((row) => ({
      id: row.id,
      events: row.events,
    }));
    const client = result4[0].map((row) => ({
      id: row.id,
      client: row.clientName,
    }));
    const years = result5[0].map((row) => ({
      year: row.year,
    }));
    const title = result6[0].map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
    }));
    const months = result7[0].map((row) => ({
      month: row.month,
    }));
    const employee = result8[0].map((row) => ({
      id: row.id,
      employee: row.username,
    }));
    const ratePerHours = result9[0].map((row) => ({
      ratePerHour: row.ratePerHour,
    }));

    // Sorting the arrays alphabetically by their respective properties
    client.sort((a, b) => a.client.localeCompare(b.client));
    events.sort((a, b) => a.events.localeCompare(b.events));
    locations.sort((a, b) => a.location.localeCompare(b.location));
    tasks.sort((a, b) => a.tasks.localeCompare(b.tasks));
    employee.sort((a, b) => a.employee.localeCompare(b.employee));

    const data = {
      locations,
      tasks,
      events,
      client,
      title,
      year: years,
      month: months,
      employee,
      ratePerHour: ratePerHours,
    };

    res.json(data);
  } catch (error) {
    console.error("Error retrieving filtered employee details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Employee Entry Add POST API
export const employeeDetailsAdd = async (req, res) => {
  try {
    const {
      employeeIds,
      date,
      locationId,
      eventId,
      taskId,
      startTime,
      hours,
      ratePerHour,
      clientId,
    } = req.body;

    // Get the userId from the decoded user object in the request
    const { userId } = req.user;

    // Initialize rate variable
    let rate = "normal";

    // Fetch client data to check the rate
    let clientRate = "normal";
    try {
      const [clientData] = await connection.query(
        "SELECT rate FROM client WHERE id = ?",
        [clientId]
      );
      if (clientData.length) {
        clientRate = clientData[0].rate;
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
    }

    // Fetch location data to check the rate
    let locationRate = "normal";
    try {
      const [locationData] = await connection.query(
        "SELECT rate FROM location WHERE id = ?",
        [locationId]
      );
      if (locationData.length) {
        locationRate = locationData[0].rate;
      }
    } catch (error) {
      console.error("Error fetching location data:", error);
    }

    const insertionPromises = [];

    for (const dateObj of date) {
      const { date: currentDate, isPublicHoliday } = dateObj;
      const dateInstance = new Date(currentDate);

      // Adjust ratePerHour if it's a public holiday or weekend or client/location rate is double and rate is not yet doubled
      let adjustedRatePerHour = ratePerHour;
      if (
        isPublicHoliday ||
        ((dateInstance.getDay() === 0 || dateInstance.getDay() === 6) &&
          clientRate === "double" &&
          locationRate === "double")
      ) {
        adjustedRatePerHour *= 2; // Double the ratePerHour
        rate = "double"; // Set rate to "double" if any condition for double rate is met
      } else {
        rate = "normal";
      }

      // Parse the startTime in the format "hh:mm"
      const [startHour, startMinute] = startTime.split(":").map(Number);

      // Parse the hours as a float
      const hoursFloat = parseFloat(hours);

      // Calculate the endTime
      const endHour = (startHour + Math.floor(hoursFloat)) % 24;
      const endMinute =
        (startMinute + (hoursFloat - Math.floor(hoursFloat)) * 60) % 60;

      // Format the end time as "hh:mm"
      const endTime = `${String(endHour).padStart(2, "0")}:${String(
        endMinute
      ).padStart(2, "0")}`;

      // Fetch the year, month from the date
      const year = dateInstance.getFullYear();
      const month = dateInstance.toLocaleString("default", { month: "short" });
      const week = moment(dateInstance).isoWeek();

      for (const employeeId of employeeIds) {
        try {
          const checkQuery = `
            SELECT * FROM timesheet 
            WHERE employeeId = ? 
            AND date = ? 
            AND locationId = ? 
            AND eventId = ? 
            AND taskId = ? 
            AND startTime = ? 
            AND endTime = ? 
            AND ratePerHour = ?
          `;

          const checkQueryParams = [
            employeeId,
            currentDate,
            locationId,
            eventId,
            taskId,
            startTime,
            endTime,
            adjustedRatePerHour, // Use adjustedRatePerHour for checking
          ];

          const [existingEntries] = await connection.query(
            checkQuery,
            checkQueryParams
          );

          if (existingEntries.length === 0) {
            const query = `
              INSERT INTO timesheet (employeeId, date, locationId, eventId, taskId, startTime, endTime, ratePerHour, hours, cost, year, month, week, createdBy, rate, clientId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const parameters = [
              employeeId,
              currentDate,
              locationId,
              eventId,
              taskId,
              startTime,
              endTime,
              adjustedRatePerHour, // Use adjustedRatePerHour for insertion
              hoursFloat,
              hoursFloat * adjustedRatePerHour, // Use adjustedRatePerHour for cost calculation
              year,
              month,
              week,
              userId,
              rate, // Use the determined rate value
              clientId,
            ];

            try {
              const [result] = await connection.execute(query, parameters);
              if (result.affectedRows === 1) {
                // Log the add action
                await logAction("add", null, result.insertId, userId);
                insertionPromises.push(true);
              } else {
                insertionPromises.push(false);
              }
            } catch (error) {
              console.error("Error adding employee entry:", error);
              insertionPromises.push(false);
            }
          } else if (
            employeeIds.length === 1 &&
            date.length === 1 &&
            existingEntries.length > 0
          ) {
            return res.status(409).json({ message: "Entry already exists" });
          }
        } catch (error) {
          console.error("Error checking existing entries:", error);
          return res
            .status(500)
            .json({ message: "Error checking existing entries" });
        }
      }
    }

    const insertionResults = await Promise.all(insertionPromises);

    if (insertionResults.every((result) => result)) {
      res.status(201).json({ message: "Employee entries added successfully" });
    } else {
      res.status(500).json({ message: "Failed to add employee entries" });
    }
  } catch (error) {
    console.error("Error adding employee entries:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to convert decimal to time
function decimalToTime(decimal) {
  const totalHours = decimal * 24;
  const hour24 = Math.floor(totalHours);
  const fraction = totalHours - hour24;
  const minutes = Math.round(fraction * 60);

  // Format the hour, minutes, and seconds to always have two digits
  const hourStr = String(hour24).padStart(2, "0");
  const minutesStr = String(minutes).padStart(2, "0");

  // Return time in 24-hour format "HH:mm:ss"
  return `${hourStr}:${minutesStr}`;
}

// Employee Entry Add From Excel POST API
export const addFromExcel = async (req, res) => {
  // Check if req.file exists
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    // Load the Excel workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);

    // Assuming you have a single sheet, get the first sheet
    const worksheet = workbook.getWorksheet(1); // Get first worksheet

    // Define your custom headers or keys (adjust as per your Excel structure)
    const headers = {
      "Employee Name": "username",
      Email: "email",
      Date: "date",
      Client: "clientName",
      "Client Email": "clientEmail",
      Location: "location",
      Event: "events",
      Task: "tasks",
      "Start Time": "startTime",
      "R P H": "ratePerHours",
      Hours: "hours",
      "Is Public Holiday": "isPublicHoliday", // Assuming you have this column in Excel
    };

    // Validate if required columns are present
    const firstRow = worksheet.getRow(1).values;
    const missingColumns = Object.keys(headers).filter(
      (key) => !firstRow.includes(key)
    );

    if (missingColumns.length > 0) {
      return res
        .status(400)
        .json({ error: `Missing columns: ${missingColumns.join(", ")}` });
    }

    // Convert the sheet data to JSON format with custom keys
    const excelData = [];
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > 1) {
        // Skip headers row
        let rowData = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const headerName = firstRow[colNumber];
          const key = headers[headerName];
          rowData[key] = cell.value;
        });
        excelData.push(rowData);
      }
    });

    // Check if excelData is empty or null
    if (!excelData || excelData.length === 0) {
      return res.status(400).json({ error: "Excel data is empty or invalid." });
    }

    // Get the userId from the decoded user object in the request
    const { userId } = req.user;

    // Initialize arrays for storing SQL queries and parameters
    const insertionPromises = [];
    const duplicateEntries = [];

    // Email validation regex pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Collect existing entries first
    for (let i = 0; i < excelData.length; i++) {
      const data = excelData[i];

      try {
        // Handle email field format and validate email
        const email =
          typeof data.email === "object" ? data.email.text : data.email;
        if (!emailPattern.test(email)) {
          return res.status(400).json({
            error: `Row ${i + 2}: Invalid email format for ${email}`,
          });
        }

        // Validate the ISO 8601 date field
        const isValidISODate = moment(
          data.date,
          moment.ISO_8601,
          true
        ).isValid();

        if (!isValidISODate) {
          return res.status(400).json({
            error: `Row ${i + 2}: Invalid date format for ${data.date}`,
          });
        }

        // Convert ISO 8601 date to YYYY-MM-DD format
        const dateFormatted = moment(data.date).format("YYYY-MM-DD");

        // Match or create Employee
        const employeeId = await findOrCreateEntity(
          "users",
          "email",
          email, // Pass email from Excel to findOrCreateEntity
          { username: data.username }
        );

        // Match or create Location
        const locationId = await findOrCreateEntity(
          "location",
          "location",
          data.location
        );

        // Match or create Event
        const eventId = await findOrCreateEntity(
          "events",
          "events",
          data.events
        );

        // Match or create Task
        const taskId = await findOrCreateEntity("tasks", "tasks", data.tasks);

        // Handle client email field format and validate email
        const clientEmail =
          typeof data.clientEmail === "object"
            ? data.clientEmail.text
            : data.clientEmail;
        if (!emailPattern.test(clientEmail)) {
          return res.status(400).json({
            error: `Row ${
              i + 2
            }: Invalid client email format for ${clientEmail}`,
          });
        }

        // Match or create Client
        const clientId = await findOrCreateEntity(
          "client",
          "email",
          clientEmail,
          { clientName: data.clientName }
        );

        // Fetch client data to check the rate
        const [clientData] = await connection.query(
          "SELECT rate FROM client WHERE id = ?",
          [clientId]
        );
        const clientRate = clientData.length ? clientData[0].rate : "normal";

        // Fetch location data to check the rate
        const [locationData] = await connection.query(
          "SELECT rate FROM location WHERE id = ?",
          [locationId]
        );
        const locationRate = locationData.length
          ? locationData[0].rate
          : "normal";

        // Adjust ratePerHour if it's a public holiday or weekend or client/location rate is double and rate is not yet doubled
        let adjustedRatePerHour = parseFloat(data.ratePerHours);
        let rate = "normal";
        const dateInstance = new Date(dateFormatted);
        const isPublicHoliday = data.isPublicHoliday === true; // Assuming "TRUE" indicates a public holiday

        if (
          isPublicHoliday ||
          ((dateInstance.getDay() === 0 || dateInstance.getDay() === 6) &&
            clientRate === "double" &&
            locationRate === "double")
        ) {
          adjustedRatePerHour *= 2; // Double the ratePerHour
          rate = "double"; // Set rate to "double" if any condition for double rate is met
        }

        // Format the startTime to match your database format "HH:mm"
        const startTimeFormatted = decimalToTime(data.startTime);
        const [startHour, startMinute] = startTimeFormatted
          .split(":")
          .map(Number);

        // Parse the hours as a float
        const hoursFloat = parseFloat(data.hours);

        // Calculate the endTime
        const endHour = (startHour + Math.floor(hoursFloat)) % 24;
        const endMinute =
          (startMinute + (hoursFloat - Math.floor(hoursFloat)) * 60) % 60;

        // Format the end time as "hh:mm"
        const endTime = `${String(endHour).padStart(2, "0")}:${String(
          endMinute
        ).padStart(2, "0")}`;

        // Check if an entry with the same details already exists
        const checkQuery = `
          SELECT * FROM timesheet
          WHERE employeeId = ?
          AND date = ?
          AND locationId = ?
          AND eventId = ?
          AND taskId = ?
          AND startTime = ?
          AND endTime = ?
          AND ratePerHour = ?
        `;

        const checkQueryParams = [
          employeeId,
          dateFormatted,
          locationId,
          eventId,
          taskId,
          startTimeFormatted,
          endTime,
          adjustedRatePerHour, // Use adjustedRatePerHour for checking
        ];

        const [existingEntries] = await connection.query(
          checkQuery,
          checkQueryParams
        );

        if (existingEntries.length > 0) {
          duplicateEntries.push(i + 2); // Collect row number of duplicate entries
        }
      } catch (error) {
        console.error("Error processing data row:", error);
        return res
          .status(500)
          .json({ error: `Row ${i + 2}: Error processing data row` });
      }
    }

    // If any duplicates are found, return an error with row numbers
    if (duplicateEntries.length > 0) {
      return res.status(400).json({
        error: `Rows ${duplicateEntries.join(
          ", "
        )} already exist in the database.`,
      });
    }

    // Proceed with insertion if no duplicates found
    for (let i = 0; i < excelData.length; i++) {
      const data = excelData[i];

      try {
        // Handle email field format and validate email
        const email =
          typeof data.email === "object" ? data.email.text : data.email;
        if (!emailPattern.test(email)) {
          return res.status(400).json({
            error: `Row ${i + 2}: Invalid email format for ${email}`,
          });
        }

        // Validate the ISO 8601 date field
        const isValidISODate = moment(
          data.date,
          moment.ISO_8601,
          true
        ).isValid();

        if (!isValidISODate) {
          return res.status(400).json({
            error: `Row ${i + 2}: Invalid date format for ${data.date}`,
          });
        }

        // Convert ISO 8601 date to YYYY-MM-DD format
        const dateFormatted = moment(data.date).format("YYYY-MM-DD");

        // Match or create Employee
        const employeeId = await findOrCreateEntity(
          "users",
          "email",
          email, // Pass email from Excel to findOrCreateEntity
          { username: data.username }
        );

        // Match or create Location
        const locationId = await findOrCreateEntity(
          "location",
          "location",
          data.location
        );

        // Match or create Event
        const eventId = await findOrCreateEntity(
          "events",
          "events",
          data.events
        );

        // Match or create Task
        const taskId = await findOrCreateEntity("tasks", "tasks", data.tasks);

        // Handle client email field format and validate email
        const clientEmail =
          typeof data.clientEmail === "object"
            ? data.clientEmail.text
            : data.clientEmail;
        if (!emailPattern.test(clientEmail)) {
          return res.status(400).json({
            error: `Row ${
              i + 2
            }: Invalid client email format for ${clientEmail}`,
          });
        }

        // Match or create Client
        const clientId = await findOrCreateEntity(
          "client",
          "email",
          clientEmail,
          { clientName: data.clientName }
        );

        // Fetch client data to check the rate
        const [clientData] = await connection.query(
          "SELECT rate FROM client WHERE id = ?",
          [clientId]
        );
        const clientRate = clientData.length ? clientData[0].rate : "normal";

        // Fetch location data to check the rate
        const [locationData] = await connection.query(
          "SELECT rate FROM location WHERE id = ?",
          [locationId]
        );
        const locationRate = locationData.length
          ? locationData[0].rate
          : "normal";

        // Adjust ratePerHour if it's a public holiday or weekend or client/location rate is double and rate is not yet doubled
        let adjustedRatePerHour = parseFloat(data.ratePerHours);
        let rate = "normal";
        const dateInstance = new Date(dateFormatted);
        const isPublicHoliday = data.isPublicHoliday === true; // Assuming "TRUE" indicates a public holiday

        if (
          isPublicHoliday ||
          ((dateInstance.getDay() === 0 || dateInstance.getDay() === 6) &&
            clientRate === "double" &&
            locationRate === "double")
        ) {
          adjustedRatePerHour *= 2; // Double the ratePerHour
          rate = "double"; // Set rate to "double" if any condition for double rate is met
        }

        // Format the startTime to match your database format "HH:mm"
        const startTimeFormatted = decimalToTime(data.startTime);

        const [startHour, startMinute] = startTimeFormatted
          .split(":")
          .map(Number);

        // Parse the hours as a float
        const hoursFloat = parseFloat(data.hours);

        // Calculate the endTime
        const endHour = (startHour + Math.floor(hoursFloat)) % 24;
        const endMinute =
          (startMinute + (hoursFloat - Math.floor(hoursFloat)) * 60) % 60;

        // Format the end time as "hh:mm"
        const endTime = `${String(endHour).padStart(2, "0")}:${String(
          endMinute
        ).padStart(2, "0")}`;

        // Insert new timesheet entry
        const insertQuery = `
          INSERT INTO timesheet
          (employeeId, date, clientId, locationId, eventId, taskId, startTime, endTime, ratePerHour, hours, cost, year, month, week, rate, createdBy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertQueryParams = [
          employeeId,
          dateFormatted,
          clientId,
          locationId,
          eventId,
          taskId,
          startTimeFormatted,
          endTime,
          adjustedRatePerHour, // Use adjustedRatePerHour for insertion
          hoursFloat,
          hoursFloat * adjustedRatePerHour, // Use adjustedRatePerHour for cost calculation
          dateInstance.getFullYear(),
          dateInstance.toLocaleString("default", {
            month: "short",
          }),
          moment(dateInstance).isoWeek(),
          rate, // Use the determined rate value
          userId,
        ];

        insertionPromises.push(
          connection.query(insertQuery, insertQueryParams)
        );
      } catch (error) {
        console.error("Error inserting data row:", error);
        return res
          .status(500)
          .json({ error: `Row ${i + 2}: Error inserting data row` });
      }
    }

    // Execute all insertion queries
    await Promise.all(insertionPromises);

    res.status(200).json({ message: "Data successfully added." });
  } catch (error) {
    console.error("Error processing Excel file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Excel sheet Import data template download
export const excelTemplateDownload = async (req, res) => {
  try {
    // Generate the Excel file
    const buffer = await generateExcelFromTemplate();

    // Send the buffer as a response
    const filename = "import-timesheet.xlsx";
    res.attachment(filename);
    res.send(buffer);
  } catch (error) {
    res.status(500).send("Error generating Excel template.");
  }
};

// Function to find or create an entity in the database
async function findOrCreateEntity(
  tableName,
  fieldName,
  value,
  additionalFields = {}
) {
  try {
    // Trim spaces from the value and additional fields
    value = value.trim();
    Object.keys(additionalFields).forEach((key) => {
      additionalFields[key] = additionalFields[key].trim();
    });

    // Example query to find existing entry
    let query = `SELECT id FROM ${tableName} WHERE ${fieldName} LIKE ?`;
    let [results] = await connection.query(query, [value]);

    // If entry exists, return its id
    if (results.length > 0) {
      return results[0].id;
    }

    // Otherwise, create a new entry and return its id
    let insertFields = `${fieldName}`;
    let insertValues = [value];

    // Check if additional fields are provided (specific to users table)
    if (tableName === "users" && additionalFields.username !== undefined) {
      insertFields += ", username";
      insertValues.push(additionalFields.username);
    }

    // Check if additional fields are provided (specific to client table)
    if (tableName === "client" && additionalFields.clientName !== undefined) {
      insertFields += ", clientName";
      insertValues.push(additionalFields.clientName);
    }

    query = `INSERT INTO ${tableName} (${insertFields}) VALUES (?)`;

    [results] = await connection.query(query, [insertValues]);

    // Check if it's the users table and we have an email address to send a registration email
    if (tableName === "users" && value) {
      const subject = "Action Required: Complete Your User Registration";
      const text = `To finalize your registration, please click on the link : 
        ${process.env.PASSWORD_URL}/generate-password`;

      // Send an email to the provided email address
      await sendMail(value, subject, text);
    }

    return results.insertId;
  } catch (error) {
    console.error(`Error finding/creating ${tableName}:`, error);
    throw error;
  }
}

// Employee Update API
export const employeeDetailsUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employeeId,
      date,
      locationId,
      eventId,
      taskId,
      startTime,
      hours,
      ratePerHour,
      rate,
      clientId,
    } = req.body;

    // Get the userId from the decoded user object in the request
    const { userId } = req.user;

    // Check if the entry exists
    const existingEntryQuery = "SELECT * FROM timesheet WHERE timesheet_id = ?";
    const [existingEntry] = await connection.execute(existingEntryQuery, [id]);

    if (!existingEntry.length) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const currentEntry = existingEntry[0];

    // Compare the new data with the existing data to identify changes
    const changedData = {};
    let updateNotificationStatus = false;

    if (employeeId !== currentEntry.employeeId) {
      changedData.employeeId = employeeId;
      updateNotificationStatus = true;
    }
    if (date !== currentEntry.date) {
      changedData.date = date;
      updateNotificationStatus = true;
    }
    if (locationId !== currentEntry.locationId) {
      changedData.locationId = locationId;
      updateNotificationStatus = true;
    }
    if (eventId !== currentEntry.eventId) {
      changedData.eventId = eventId;
      updateNotificationStatus = true;
    }
    if (taskId !== currentEntry.taskId) {
      changedData.taskId = taskId;
      updateNotificationStatus = true;
    }
    if (hours !== currentEntry.hours) {
      changedData.hours = hours;
    }
    if (ratePerHour !== currentEntry.ratePerHour) {
      changedData.ratePerHour = ratePerHour;
    }
    if (rate !== currentEntry.rate) {
      changedData.rate = rate;
    }
    if (clientId !== currentEntry.clientId) {
      changedData.clientId = clientId;
      updateNotificationStatus = true;
    }

    const dateInstance = new Date(date);
    // Parse the startTime in the format "hh:mm"
    const [startHour, startMinute] = startTime.split(":").map(Number);

    // Parse the hours as a float
    const hoursFloat = parseFloat(hours);

    // Calculate the endTime
    const endHour = (startHour + Math.floor(hoursFloat)) % 24;
    const endMinute =
      (startMinute + (hoursFloat - Math.floor(hoursFloat)) * 60) % 60;

    // Format the end time as "hh:mm"
    const endTime = `${String(endHour).padStart(2, "0")}:${String(
      endMinute
    ).padStart(2, "0")}`;

    // Fetch the year, month from the date
    const year = dateInstance.getFullYear();
    const month = dateInstance.toLocaleString("default", { month: "short" });
    const week = moment(dateInstance).isoWeek();

    // Prepare the query with parameterized query
    const query =
      "UPDATE timesheet SET employeeId = ?, date = ?, locationId = ?, eventId = ?, taskId = ?, startTime = ?, endTime = ?, ratePerHour = ?, hours = ?, cost = ?, year = ?, month = ?, week = ?, lastModifiedBy = ?, rate = ?, clientId = ? WHERE timesheet_id = ?";

    const parameters = [
      employeeId,
      date,
      locationId,
      eventId,
      taskId,
      startTime,
      endTime,
      ratePerHour,
      hoursFloat,
      hoursFloat * ratePerHour,
      year,
      month,
      week,
      userId,
      rate,
      clientId,
      id,
    ];

    // Execute the query with parameterized query
    const [result] = await connection.execute(query, parameters);

    // Check if the entry was successfully updated
    if (result.affectedRows === 1) {
      // Log the update action
      await logAction("update", changedData, id, userId);

      // If any of the specified fields changed, update or insert whatsapp_notifications
      if (updateNotificationStatus) {
        const checkNotificationQuery =
          "SELECT * FROM whatsapp_notifications WHERE timesheetId = ?";
        const [existingNotification] = await connection.execute(
          checkNotificationQuery,
          [id]
        );

        if (existingNotification.length) {
          // Update existing notification record
          const updateNotificationQuery =
            "UPDATE whatsapp_notifications SET status = 0, action_type = 'update' WHERE timesheetId = ?";
          await connection.execute(updateNotificationQuery, [id]);
        }
      }

      res.status(200).json({ message: "Employee entry updated successfully" });
    } else {
      res.status(500).json({ message: "Failed to update employee entry" });
    }
  } catch (error) {
    // Handle any errors that occur during the entry update
    console.error("Error updating employee entry:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Employee invoiced Update API
export const updateInvoices = async (req, res) => {
  try {
    // Extract invoice data from request body
    const invoicesToUpdate = req.body;

    // Get the userId from the decoded user object in the request
    const { userId } = req.user;

    // Check if there are invoices to update
    if (
      !invoicesToUpdate ||
      !Array.isArray(invoicesToUpdate) ||
      invoicesToUpdate.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "No invoices provided for update" });
    }

    // Prepare an array to store promises for each update operation
    const updatePromises = [];

    // Iterate over each invoice object and create a promise for updating it
    invoicesToUpdate.forEach(async (invoice) => {
      const { timesheet_id, invoiced } = invoice;

      // Prepare the update query
      const updateQuery =
        "UPDATE timesheet SET invoiced = ? WHERE timesheet_id = ?";

      // Execute the update query with parameters and push the promise to the array
      updatePromises.push(
        connection.execute(updateQuery, [invoiced, timesheet_id])
      );
    });

    // Execute all update promises simultaneously
    const results = await Promise.all(updatePromises);

    // Check if all updates were successful
    const successfulUpdates = results.filter(
      ([result]) => result.affectedRows === 1
    );

    if (successfulUpdates.length === invoicesToUpdate.length) {
      // Log the update action for each successful invoice update
      for (const invoice of invoicesToUpdate) {
        const { timesheet_id, invoiced } = invoice;
        await logAction(
          "update",
          { timesheet_id, invoiced },
          timesheet_id,
          userId
        );
      }

      res.status(200).json({ message: "All invoices updated successfully" });
    } else {
      res.status(500).json({ message: "Some invoices failed to update" });
    }
  } catch (error) {
    console.error("Error updating invoices:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Employee Entry GET API
export const employeeView = async (req, res) => {
  try {
    let query = `
      SELECT timesheet.*, employee.username AS username, createdByUser.username AS createdByUsername, modifierUser.username AS lastModifiedByUsername, location.location, events.events, events.eventColor, tasks.tasks, client.clientName
      FROM timesheet
      INNER JOIN users AS employee ON timesheet.employeeId = employee.id
      INNER JOIN location ON timesheet.locationId = location.id
      INNER JOIN events ON timesheet.eventId = events.id
      INNER JOIN tasks ON timesheet.taskId = tasks.id
      LEFT JOIN client ON timesheet.clientId = client.id
      LEFT JOIN users AS createdByUser ON timesheet.createdBy = createdByUser.id
      LEFT JOIN users AS modifierUser ON timesheet.lastModifiedBy = modifierUser.id
    `;

    const queryParams = [];
    let whereClause = "";

    // Check if user is logged in
    if (req.user.userId && req.user.role === "2") {
      const userId = req.user.userId;
      whereClause = ` WHERE employee.id = ?`;
      queryParams.push(userId);
    }

    // Filter by locationId
    if (req.query.locationId) {
      const locationIds = Array.isArray(req.query.locationId)
        ? req.query.locationId
        : [req.query.locationId];

      if (whereClause === "") {
        whereClause = " WHERE";
      } else {
        whereClause += " AND";
      }

      whereClause += ` timesheet.locationId IN (${locationIds
        .map(() => "?")
        .join(", ")})`;
      queryParams.push(...locationIds);
    }

    const invoicedValue = req.query.invoiced;

    if (
      invoicedValue !== undefined &&
      (invoicedValue === "0" || invoicedValue === "1")
    ) {
      if (whereClause === "") {
        whereClause = " WHERE";
      } else {
        whereClause += " AND";
      }
      whereClause += ` timesheet.invoiced = ?`;
      queryParams.push(invoicedValue);
    }

    query += whereClause;

    // Execute the query to count total records
    const [totalCountResult] = await connection.query(
      `SELECT COUNT(*) AS totalCount FROM (${query}) AS countQuery`,
      queryParams
    );

    const totalCount = totalCountResult[0].totalCount;

    // Add ORDER BY for pagination
    query += ` ORDER BY timesheet.timesheet_id DESC`;

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || Number.MAX_SAFE_INTEGER;
    const offset = (page - 1) * pageSize;

    // Add LIMIT and OFFSET
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);

    // Execute the main query
    const [result] = await connection.query(query, queryParams);

    if (result.length > 0) {
      res.status(200).json({
        employees: result.map((employee) => ({ ...employee })),
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / pageSize),
        currentPageData: result.length,
        totalData: totalCount,
      });
    } else {
      res.status(404).json({ message: "No employees found" });
    }
  } catch (error) {
    console.error("Error retrieving employee information:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const employeeViewV2 = async (req, res) => {
  try {
    let query = `
      SELECT timesheet.*, employee.username AS username, createdByUser.username AS createdByUsername, modifierUser.username AS lastModifiedByUsername, location.location, events.events, events.eventColor, tasks.tasks, client.clientName
      FROM timesheet
      INNER JOIN users AS employee ON timesheet.employeeId = employee.id
      INNER JOIN location ON timesheet.locationId = location.id
      INNER JOIN events ON timesheet.eventId = events.id
      INNER JOIN tasks ON timesheet.taskId = tasks.id
      LEFT JOIN client ON timesheet.clientId = client.id
      LEFT JOIN users AS createdByUser ON timesheet.createdBy = createdByUser.id
      LEFT JOIN users AS modifierUser ON timesheet.lastModifiedBy = modifierUser.id
    `;

    const queryParams = [];
    let whereClause = "";

    // Check if user is logged in
    if ((req.user.userId && req.user.role === "2") || req.query.userId) {
      const userId = req.query.userId ? req.query.userId : req.user.userId;
      whereClause = ` WHERE employee.id = ?`;
      queryParams.push(userId);
    }

    // Filter by locationId
    if (req.query.locationId) {
      const locationIds = Array.isArray(req.query.locationId)
        ? req.query.locationId
        : [req.query.locationId];

      whereClause += whereClause ? " AND" : " WHERE";
      whereClause += ` timesheet.locationId IN (${locationIds
        .map(() => "?")
        .join(", ")})`;
      queryParams.push(...locationIds);
    }

    // Filter by invoiced status
    const invoicedValue = req.query.invoiced;
    if (
      invoicedValue !== undefined &&
      (invoicedValue === "0" || invoicedValue === "1")
    ) {
      whereClause += whereClause ? " AND" : " WHERE";
      whereClause += ` timesheet.invoiced = ?`;
      queryParams.push(invoicedValue);
    }

    // Date filters: Default to current week, unless startDate and endDate are provided
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    if (startDate && endDate) {
      whereClause += whereClause ? " AND" : " WHERE";
      whereClause += ` timesheet.date BETWEEN ? AND ?`;
      queryParams.push(startDate, endDate);
    } else {
      // Default to current week
      const startOfWeek = moment().startOf("week").format("YYYY-MM-DD");
      const endOfWeek = moment().endOf("week").format("YYYY-MM-DD");
      whereClause += whereClause ? " AND" : " WHERE";
      whereClause += ` timesheet.date BETWEEN ? AND ?`;
      queryParams.push(startOfWeek, endOfWeek);
    }

    query += whereClause;

    // Execute the query to count total records
    const [totalCountResult] = await connection.query(
      `SELECT COUNT(*) AS totalCount FROM (${query}) AS countQuery`,
      queryParams
    );

    const totalCount = totalCountResult[0].totalCount;

    // Add ORDER BY for pagination
    query += ` ORDER BY timesheet.timesheet_id DESC`;

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || Number.MAX_SAFE_INTEGER;
    const offset = (page - 1) * pageSize;

    // Add LIMIT and OFFSET
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);

    // Execute the main query
    const [result] = await connection.query(query, queryParams);

    if (result.length > 0) {
      res.status(200).json({
        employees: result.map((employee) => ({ ...employee })),
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / pageSize),
        currentPageData: result.length,
        totalData: totalCount,
      });
    } else {
      res.status(404).json({ message: "No employees found" });
    }
  } catch (error) {
    console.error("Error retrieving employee information:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Employee Entry Delete API
export const employeeDelete = async (req, res) => {
  try {
    const { id } = req.params;

    // Perform the database query to get the entry before deletion
    const [deletedEntry] = await connection.execute(
      "SELECT * FROM timesheet WHERE timesheet_id = ?",
      [id]
    );

    if (deletedEntry.length === 0) {
      return res.status(404).json({ error: "Employee entry not found" });
    }

    // // Check if there is an existing notification record
    // const checkNotificationQuery =
    //   "SELECT * FROM whatsapp_notifications WHERE timesheetId = ?";
    // const [existingNotification] = await connection.execute(
    //   checkNotificationQuery,
    //   [id]
    // );

    // if (existingNotification.length > 0) {
    //   // Update notification record
    //   await connection.execute(
    //     "UPDATE whatsapp_notifications SET status = 0, action_type = 'delete' WHERE timesheetId = ?",
    //     [id]
    //   );

    //   try {
    //     // Trigger WhatsApp notification
    //     const whatsappResult = await whatsappScheduler();
    //     if (!whatsappResult) {
    //       console.error("Error sending WhatsApp message");
    //     }
    //   } catch (error) {
    //     console.error("Error in whatsappScheduler:", error);
    //   }
    // }
    // Perform the database query to delete the employee entry
    const deleteQuery = "DELETE FROM timesheet WHERE timesheet_id = ?";
    await connection.execute(deleteQuery, [id]);

    // Log the delete action
    await logAction("delete", deletedEntry[0], id, req.user.userId);

    res.status(200).json({ message: "Employee entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee entry:", error);
    res.status(500).json({ error: "Failed to delete employee entry" });
  }
};

// Employee Report GET
export const employeeReport = async (req, res) => {
  try {
    const {
      year,
      month,
      employeeId,
      locationId,
      eventId,
      taskId,
      page,
      perPage,
      rate,
      ratePerHour,
      clientId,
      action,
      titleId,
    } = req.query;

    // Prepare the base query to fetch employee data
    let query = `
      SELECT timesheet.*, users.username, users.email, location.location, events.events, tasks.tasks, client.clientName, client.email as clientEmail
      FROM timesheet
      LEFT JOIN users ON timesheet.employeeId = users.id
      LEFT JOIN location ON timesheet.locationId = location.id
      LEFT JOIN events ON timesheet.eventId = events.id
      LEFT JOIN tasks ON timesheet.taskId = tasks.id
      LEFT JOIN client ON timesheet.clientId = client.id
    `;

    // Prepare the query parameters
    const queryParams = [];

    // Prepare the WHERE clause for filtering by year and month
    const whereClause = [];

    if (year) {
      whereClause.push("timesheet.year = ?");
      queryParams.push(year);
    }

    if (month) {
      whereClause.push("timesheet.month = ?");
      queryParams.push(month);
    }

    if (employeeId) {
      const employeeIds = Array.isArray(employeeId)
        ? employeeId
        : employeeId.split(",");
      const idPlaceholders = employeeIds.map(() => "?").join(", ");
      whereClause.push(`timesheet.employeeId IN (${idPlaceholders})`);
      queryParams.push(...employeeIds);
    }

    if (locationId) {
      whereClause.push("timesheet.locationId = ?");
      queryParams.push(locationId);
    }

    if (eventId) {
      whereClause.push("timesheet.eventId = ?");
      queryParams.push(eventId);
    }

    if (taskId) {
      whereClause.push("timesheet.taskId = ?");
      queryParams.push(taskId);
    }

    if (rate) {
      whereClause.push("timesheet.rate = ?");
      queryParams.push(rate);
    }

    if (ratePerHour) {
      const ratePerHours = Array.isArray(ratePerHour)
        ? ratePerHour
        : ratePerHour.split(",");

      const idPlaceholders = ratePerHours.map(() => "?").join(", ");
      whereClause.push(`timesheet.ratePerHour IN (${idPlaceholders})`);
      queryParams.push(...ratePerHours);
    }

    if (clientId) {
      whereClause.push("timesheet.clientId = ?");
      queryParams.push(clientId);
    }

    // Add the WHERE clause to the query if filters are provided
    if (whereClause.length > 0) {
      query += " WHERE " + whereClause.join(" AND ");
    }

    // Execute the query without pagination for grand total calculation
    const [totalResult] = await connection.execute(
      `SELECT * FROM timesheet` +
        (whereClause.length > 0 ? ` WHERE ${whereClause.join(" AND ")}` : ""),
      queryParams
    );

    // Initialize variables for grand totals
    let grandTotalShift = 0;
    let grandTotalHours = 0;
    let grandTotalCost = 0;

    // Iterate over the totalResult to calculate grand totals
    for (const record of totalResult) {
      grandTotalShift += 1;
      grandTotalHours += parseFloat(record.hours);
      grandTotalCost += parseFloat(record.cost);
    }

    query += " ORDER BY timesheet.employeeId, timesheet.date DESC";

    // Pagination
    if (action === "download" || action === "download-excel") {
      // Do nothing, as action is "download"
    } else {
      if (page && perPage) {
        const offset = (parseInt(page) - 1) * parseInt(perPage);
        query += ` LIMIT ${parseInt(perPage)} OFFSET ${offset}`;
      }
    }

    // Get the total count of records
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as totalCount FROM timesheet` +
        (whereClause.length > 0 ? ` WHERE ${whereClause.join(" AND ")}` : ""),
      queryParams
    );
    const totalCount = countResult[0].totalCount;
    const totalPages = Math.ceil(totalCount / parseInt(perPage));

    // Execute the query with the given parameters
    const [result] = await connection.execute(query, queryParams);
    const jsonResult = result;

    // Prepare the response data structure
    const reports = [];

    // Iterate over the result and organize the records by username, year, and month
    for (const record of result) {
      let employeeData = reports.find(
        (item) => item.username === record.username
      );

      if (!employeeData) {
        employeeData = {
          username: record.username,
          email: record.email,
          clientEmail: record.clientEmail,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        reports.push(employeeData);
      }

      let rateData = employeeData.records.find(
        (item) => item.rate === record.rate
      );

      if (!rateData) {
        rateData = {
          rate: record.rate,
          records: [],
        };
        employeeData.records.push(rateData);
      }

      let yearData = rateData.records.find((item) => item.year === record.year);

      if (!yearData) {
        yearData = {
          year: record.year,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        rateData.records.push(yearData);
      }

      let monthData = yearData.records.find(
        (item) => item.month === record.month
      );

      if (!monthData) {
        monthData = {
          month: record.month,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        yearData.records.push(monthData);
      }

      let ratePerHourData = monthData.records.find(
        (item) => item.ratePerHour === record.ratePerHour
      );

      if (!ratePerHourData) {
        ratePerHourData = {
          ratePerHour: record.ratePerHour,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        monthData.records.push(ratePerHourData);
      }

      const formattedRecord = {
        date: record.date,
        location: record.location,
        event: record.events,
        task: record.tasks,
        clientName: record.clientName,
        timesheet_id: record.timesheet_id,
        startTime: record.startTime,
        endTime: record.endTime,
        ratePerHour: record.ratePerHour,
        hours: record.hours,
        cost: record.cost,
        week: record.week,
        locationId: record.locationId,
        eventId: record.eventId,
        taskId: record.taskId,
        rate: record.rate,
        clientId: record.clientId,
        username: record.username,
        employeeId: record.employeeId,
      };

      ratePerHourData.records.push(formattedRecord);

      // Update the rate per hours total shift, hours, and cost
      ratePerHourData.total.shift += 1;
      ratePerHourData.total.hours += parseFloat(record.hours);
      ratePerHourData.total.cost += parseFloat(record.cost);

      if (
        !year &&
        !month &&
        !employeeId &&
        !locationId &&
        !eventId &&
        !taskId &&
        !rate &&
        !clientId
      ) {
        const monthTotalsQuery = `
        SELECT 
            COUNT(*) AS shiftCountMonth,
            SUM(hours) AS totalHoursMonth, 
            SUM(cost) AS totalCostMonth 
        FROM timesheet 
        WHERE employeeId = ? AND month = ?  AND rate = ?
        `;

        const [monthTotalsResult] = await connection.execute(monthTotalsQuery, [
          record.employeeId,
          record.month,
          record.rate,
        ]);

        // Fetch the totals from the SQL result
        const { shiftCountMonth, totalHoursMonth, totalCostMonth } =
          monthTotalsResult[0];

        // Update employeeData.total with the fetched totals
        monthData.total.shift = shiftCountMonth;
        monthData.total.hours = parseInt(totalHoursMonth);
        monthData.total.cost = parseInt(totalCostMonth);

        const yearTotalsQuery = `
        SELECT 
          COUNT(*) AS shiftCountYear,
          SUM(hours) AS totalHoursYear, 
          SUM(cost) AS totalCostYear 
        FROM timesheet 
        WHERE employeeId = ? AND year = ? AND rate = ?
        `;

        const [yearTotalsResult] = await connection.execute(yearTotalsQuery, [
          record.employeeId,
          record.year,
          record.rate,
        ]);

        // Fetch the totals from the SQL result
        const { shiftCountYear, totalHoursYear, totalCostYear } =
          yearTotalsResult[0];

        // Update employeeData.total with the fetched totals
        yearData.total.shift = shiftCountYear;
        yearData.total.hours = parseInt(totalHoursYear);
        yearData.total.cost = parseInt(totalCostYear);

        // Execute SQL query to get totals for the employee
        const employeeTotalsQuery = `
        SELECT 
          COUNT(*) AS shiftCount,
          SUM(hours) AS totalHours, 
          SUM(cost) AS totalCost 
        FROM timesheet 
        WHERE employeeId = ?
        `;

        const [employeeTotalsResult] = await connection.execute(
          employeeTotalsQuery,
          [record.employeeId]
        );

        // Fetch the totals from the SQL result
        const { shiftCount, totalHours, totalCost } = employeeTotalsResult[0];

        // Update employeeData.total with the fetched totals
        employeeData.total.shift = shiftCount;
        employeeData.total.hours = parseInt(totalHours);
        employeeData.total.cost = parseInt(totalCost);
      } else {
        // Update the monthly total shift, hours, and cost
        monthData.total.shift += 1;
        monthData.total.hours += parseFloat(record.hours);
        monthData.total.cost += parseFloat(record.cost);

        // Update the yearly total shift, hours, and cost
        yearData.total.shift += 1;
        yearData.total.hours += parseFloat(record.hours);
        yearData.total.cost += parseFloat(record.cost);

        // Update the employee's total shift, hours, and cost
        employeeData.total.shift += 1;
        employeeData.total.hours += parseFloat(record.hours);
        employeeData.total.cost += parseFloat(record.cost);

        // Update the grand total shift, hours, and cost
        // grandTotalShift += 1;
        // grandTotalHours += parseFloat(record.hours);
        // grandTotalCost += parseFloat(record.cost);
      }
    }

    if (result.length > 0) {
      if (action === "download" && titleId) {
        try {
          const tempQuery = "SELECT timesheetName FROM template WHERE id = ?";
          const [result] = await connection.query(tempQuery, [titleId]);
          const tempString = result[0].timesheetName;
          const template = tempString
            .split(",")
            .map((columnName) => columnName.trim());

          if (reports.length === 1) {
            const report = reports[0];
            const pdfBuffer = await generatePdfFromData([report], template);

            const username = report.username || "employee";

            const filename = `${username}_employee_report.pdf`;

            res.attachment(filename);
            res.send(pdfBuffer);
          } else if (reports.length > 1) {
            const zip = archiver("zip");
            res.attachment("employee_reports.zip");
            zip.pipe(res);

            for (const report of reports) {
              const pdfBuffer = await generatePdfFromData([report], template);

              const username = report.username || "employee";

              const filename = `${username}_employee_report.pdf`;

              zip.append(pdfBuffer, { name: filename });
            }

            zip.finalize();
          } else {
            res.status(404).json({ message: "No reports found for download" });
          }
        } catch (error) {
          console.error("Error generating PDF or ZIP:", error);
          res.status(500).json({ message: "Error generating PDF or ZIP" });
        }
      } else if (action === "send") {
        try {
          const insertResult = { ...req.query };

          delete insertResult.page;
          delete insertResult.perPage;

          await connection.execute(
            "INSERT INTO queue_worker (action, action_parameters) VALUES (?, ?)",
            [action, JSON.stringify(insertResult)]
          );

          res.status(200).json({ message: "Data inserted and emails sent." });
        } catch (error) {
          console.error("Error insert data in queue_worker:", error);
          res
            .status(500)
            .json({ message: "Error insert data in queue_worker" });
        }
      } else if (action === "download-excel" && titleId) {
        try {
          const tempQuery = "SELECT timesheetName FROM template WHERE id = ?";
          const [result] = await connection.query(tempQuery, [titleId]);
          const tempString = result[0].timesheetName;
          const template = tempString
            .split(",")
            .map((columnName) => columnName.trim());

          if (reports.length > 0) {
            const excelBuffer = await generateExcelFromData(
              jsonResult,
              template
            );

            const filename = "timesheet.xlsx";
            res.attachment(filename);
            res.send(excelBuffer);
          } else {
            res.status(404).json({ message: "No reports found for download" });
          }
        } catch (error) {
          console.error("Error generating Excel:", error);
          res.status(500).json({ message: "Error generating Excel" });
        }
      } else {
        res.status(200).json({
          reports,
          grandTotal: {
            shift: grandTotalShift,
            hours: grandTotalHours,
            cost: grandTotalCost,
          },
          pagination: {
            totalCount,
            totalPages,
            currentPage: parseInt(page),
            perPageCount: parseInt(perPage),
          },
        });
      }
    } else {
      res.status(404).json({
        message: "No employees found for the given year and month",
      });
    }
  } catch (error) {
    console.error(
      "Error retrieving employee information by year and month:",
      error
    );
    res.status(500).json({ message: "Internal server error" });
  }
};

// Client Timesheet start -----------------------------------------------------------------------------

export const clientReport = async (req, res) => {
  try {
    const {
      year,
      month,
      employeeId,
      locationId,
      eventId,
      taskId,
      page,
      perPage,
      rate,
      ratePerHour,
      clientId,
      action,
      titleId,
    } = req.query;

    // Prepare the base query to fetch employee data
    let query = `
      SELECT timesheet.*, users.username, users.email, location.location, events.events, tasks.tasks, client.clientName, client.email as clientEmail
      FROM timesheet
      LEFT JOIN users ON timesheet.employeeId = users.id
      LEFT JOIN location ON timesheet.locationId = location.id
      LEFT JOIN events ON timesheet.eventId = events.id
      LEFT JOIN tasks ON timesheet.taskId = tasks.id
      LEFT JOIN client ON timesheet.clientId = client.id
    `;

    // Prepare the query parameters
    const queryParams = [];

    // Prepare the WHERE clause for filtering by year and month
    const whereClause = [];

    if (year) {
      whereClause.push("timesheet.year = ?");
      queryParams.push(year);
    }

    if (month) {
      whereClause.push("timesheet.month = ?");
      queryParams.push(month);
    }

    if (employeeId) {
      const employeeIds = Array.isArray(employeeId)
        ? employeeId
        : employeeId.split(",");
      const idPlaceholders = employeeIds.map(() => "?").join(", ");
      whereClause.push(`timesheet.employeeId IN (${idPlaceholders})`);
      queryParams.push(...employeeIds);
    }

    if (locationId) {
      whereClause.push("timesheet.locationId = ?");
      queryParams.push(locationId);
    }

    if (eventId) {
      whereClause.push("timesheet.eventId = ?");
      queryParams.push(eventId);
    }

    if (taskId) {
      whereClause.push("timesheet.taskId = ?");
      queryParams.push(taskId);
    }

    if (rate) {
      whereClause.push("timesheet.rate = ?");
      queryParams.push(rate);
    }

    if (ratePerHour) {
      const ratePerHours = Array.isArray(ratePerHour)
        ? ratePerHour
        : ratePerHour.split(",");

      const idPlaceholders = ratePerHours.map(() => "?").join(", ");
      whereClause.push(`timesheet.ratePerHour IN (${idPlaceholders})`);
      queryParams.push(...ratePerHours);
    }

    if (clientId) {
      whereClause.push("timesheet.clientId = ?");
      queryParams.push(clientId);
    }

    // Add the WHERE clause to the query if filters are provided
    if (whereClause.length > 0) {
      query += " WHERE " + whereClause.join(" AND ");
    }

    query += " ORDER BY timesheet.date DESC";

    // Execute the query without pagination for grand total calculation
    const [totalResult] = await connection.execute(
      `SELECT * FROM timesheet` +
        (whereClause.length > 0 ? ` WHERE ${whereClause.join(" AND ")}` : ""),
      queryParams
    );

    // Initialize variables for grand total
    let grandTotalShift = 0;
    let grandTotalHours = 0;
    let grandTotalCost = 0;

    // Iterate over the totalResult to calculate grand totals
    for (const record of totalResult) {
      grandTotalShift += 1;
      grandTotalHours += parseFloat(record.hours);
      grandTotalCost += parseFloat(record.cost);
    }

    // Pagination
    if (action === "download-client") {
      // Do nothing, as action is "download"
    } else {
      if (page && perPage) {
        const offset = (parseInt(page) - 1) * parseInt(perPage);
        query += ` LIMIT ${parseInt(perPage)} OFFSET ${offset}`;
      }
    }
    // Get the total count of records
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as totalCount FROM timesheet` +
        (whereClause.length > 0 ? ` WHERE ${whereClause.join(" AND ")}` : ""),
      queryParams
    );
    const totalCount = countResult[0].totalCount;

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalCount / parseInt(perPage));

    const [result] = await connection.execute(query, queryParams);

    // Prepare the response data structure
    const clientReports = [];

    // Iterate over the result and organize the records by client, location, username, year, month, and date
    for (const record of result) {
      let clientData = clientReports.find(
        (item) => item.client === record.clientName
      );

      if (!clientData) {
        clientData = {
          client: record.clientName,
          clientEmail: record.clientEmail,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        clientReports.push(clientData);
      }

      let locationData = clientData.records.find(
        (item) => item.locationId === record.locationId
      );

      if (!locationData) {
        locationData = {
          location: record.location,
          locationId: record.locationId,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        clientData.records.push(locationData);
      }

      let userData = locationData.records.find(
        (item) => item.username === record.username
      );

      if (!userData) {
        userData = {
          username: record.username,
          records: [],
        };
        locationData.records.push(userData);
      }

      let yearData = userData.records.find((item) => item.year === record.year);

      if (!yearData) {
        yearData = {
          year: record.year,
          records: [],
        };
        userData.records.push(yearData);
      }

      let monthData = yearData.records.find(
        (item) => item.month === record.month
      );

      if (!monthData) {
        monthData = {
          month: record.month,
          records: [],
        };
        yearData.records.push(monthData);
      }

      let ratePerHourData = monthData.records.find(
        (item) => item.ratePerHour === record.ratePerHour
      );

      if (!ratePerHourData) {
        ratePerHourData = {
          ratePerHour: record.ratePerHour,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        monthData.records.push(ratePerHourData);
      }

      const formattedRecord = {
        date: record.date,
        rate: record.rate,
        event: record.events,
        task: record.tasks,
        timesheet_id: record.timesheet_id,
        startTime: record.startTime,
        endTime: record.endTime,
        week: record.week,
        ratePerHour: record.ratePerHour,
        hours: parseFloat(record.hours),
        cost: parseFloat(record.cost),
      };

      ratePerHourData.records.push(formattedRecord);

      // Update the rate per hours total shift, hours, and cost
      ratePerHourData.total.shift += 1;
      ratePerHourData.total.hours += parseFloat(record.hours);
      ratePerHourData.total.cost += parseFloat(record.cost);

      if (
        !year &&
        !month &&
        !employeeId &&
        !locationId &&
        !eventId &&
        !taskId &&
        !rate &&
        !clientId
      ) {
        const clientTotalsQuery = `
        SELECT 
          COUNT(*) AS shiftCount,
          SUM(hours) AS totalHours, 
          SUM(cost) AS totalCost 
        FROM timesheet 
        WHERE clientId = ?
        `;

        const [clientTotalsResult] = await connection.execute(
          clientTotalsQuery,
          [record.clientId]
        );

        // Fetch the totals from the SQL result
        const { shiftCount, totalHours, totalCost } = clientTotalsResult[0];

        // Update employeeData.total with the fetched totals
        clientData.total.shift = shiftCount;
        clientData.total.hours = parseInt(totalHours);
        clientData.total.cost = parseInt(totalCost);

        const locationTotalsQuery = `
        SELECT 
          COUNT(*) AS shiftCountLocation,
          SUM(hours) AS totalHoursLocation, 
          SUM(cost) AS totalCostLocation 
        FROM timesheet 
        WHERE locationId = ? AND clientId = ?
        `;

        const [locationTotalsResult] = await connection.execute(
          locationTotalsQuery,
          [record.locationId, record.clientId]
        );

        // Fetch the totals from the SQL result
        const { shiftCountLocation, totalHoursLocation, totalCostLocation } =
          locationTotalsResult[0];

        locationData.total.shift = shiftCountLocation;
        locationData.total.hours = parseInt(totalHoursLocation);
        locationData.total.cost = parseInt(totalCostLocation);
      } else {
        locationData.total.shift++;
        locationData.total.hours += formattedRecord.hours;
        locationData.total.cost += formattedRecord.cost;

        clientData.total.shift++;
        clientData.total.hours += formattedRecord.hours;
        clientData.total.cost += formattedRecord.cost;

        // grandTotal.shift++;
        // grandTotal.hours += formattedRecord.hours;
        // grandTotal.cost += formattedRecord.cost;
      }
    }

    if (result.length > 0) {
      if (action === "download-client" && titleId) {
        try {
          const tempQuery = "SELECT timesheetName FROM template WHERE id = ?";
          const [result] = await connection.query(tempQuery, [titleId]);
          const tempString = result[0].timesheetName;
          const template = tempString
            .split(",")
            .map((columnName) => columnName.trim());

          if (clientReports.length === 1) {
            const report = clientReports[0];
            const pdfBuffer = await clientPdfGenerate([report], template);

            const client = report.client || "client";

            const filename = `${client}_client_report.pdf`;

            res.attachment(filename);
            res.send(pdfBuffer);
          } else if (clientReports.length > 1) {
            const zip = archiver("zip");
            res.attachment("client_reports.zip");
            zip.pipe(res);

            for (const report of clientReports) {
              const pdfBuffer = await clientPdfGenerate([report], template);

              const client = report.client || "employee";

              const filename = `${client}_client_report.pdf`;

              zip.append(pdfBuffer, { name: filename });
            }

            zip.finalize();
          } else {
            res
              .status(404)
              .json({ message: "No clientReports found for download" });
          }
        } catch (error) {
          console.error("Error generating PDF or ZIP:", error);
          res.status(500).json({ message: "Error generating PDF or ZIP" });
        }
      } else if (action === "send-client") {
        try {
          const insertResult = { ...req.query };

          delete insertResult.page;
          delete insertResult.perPage;

          await connection.execute(
            "INSERT INTO queue_worker (action, action_parameters) VALUES (?, ?)",
            [action, JSON.stringify(insertResult)]
          );

          res.status(200).json({ message: "Data inserted and emails sent." });
        } catch (error) {
          console.error("Error insert data in queue_worker:", error);
          res
            .status(500)
            .json({ message: "Error insert data in queue_worker" });
        }
      } else {
        const response = {
          reports: clientReports,
          grandTotal: {
            shift: grandTotalShift,
            hours: grandTotalHours,
            cost: grandTotalCost,
          },
          pagination: {
            totalCount: totalCount,
            totalPages: totalPages,
            currentPage: parseInt(page) || 1,
            perPageCount: parseInt(perPage) || 0,
          },
        };

        res.status(200).json(response);
      }
    } else {
      res.status(404).json({
        message: "No employees found for the given year and month",
      });
    }
  } catch (error) {
    console.error(
      "Error retrieving employee information by year and month:",
      error
    );
    res.status(500).json({ message: "Internal server error" });
  }
};

// Client Summary Report
export const clientSummaryReport = async (req, res) => {
  try {
    const { year, month, locationId, page, perPage, rate, clientId } =
      req.query;

    // Prepare the base query to fetch employee data
    let query = `
      SELECT timesheet.*, location.location, client.clientName
      FROM timesheet
      LEFT JOIN location ON timesheet.locationId = location.id
      LEFT JOIN client ON timesheet.clientId = client.id
    `;

    // Prepare the query parameters
    const queryParams = [];

    // Prepare the WHERE clause for filtering by year and month
    const whereClause = [];

    if (year) {
      whereClause.push("timesheet.year = ?");
      queryParams.push(year);
    }

    if (month) {
      whereClause.push("timesheet.month = ?");
      queryParams.push(month);
    }

    if (locationId) {
      whereClause.push("timesheet.locationId = ?");
      queryParams.push(locationId);
    }

    if (rate) {
      whereClause.push("timesheet.rate = ?");
      queryParams.push(rate);
    }

    if (clientId) {
      whereClause.push("timesheet.clientId = ?");
      queryParams.push(clientId);
    }

    // Add the WHERE clause to the query if filters are provided
    if (whereClause.length > 0) {
      query += " WHERE " + whereClause.join(" AND ");
    }

    query += " ORDER BY timesheet.date DESC";

    // Execute the query without pagination for grand total calculation
    const [totalResult] = await connection.execute(
      `SELECT * FROM timesheet` +
        (whereClause.length > 0 ? ` WHERE ${whereClause.join(" AND ")}` : ""),
      queryParams
    );

    // Initialize variables for grand total
    let grandTotalShift = 0;
    let grandTotalHours = 0;
    let grandTotalCost = 0;

    // Iterate over the totalResult to calculate grand totals
    for (const record of totalResult) {
      grandTotalShift += 1;
      grandTotalHours += parseFloat(record.hours);
      grandTotalCost += parseFloat(record.cost);
    }

    if (page && perPage) {
      const offset = (parseInt(page) - 1) * parseInt(perPage);
      query += ` LIMIT ${parseInt(perPage)} OFFSET ${offset}`;
    }

    // Get the total count of records
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as totalCount FROM timesheet` +
        (whereClause.length > 0 ? ` WHERE ${whereClause.join(" AND ")}` : ""),
      queryParams
    );
    const totalCount = countResult[0].totalCount;

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalCount / parseInt(perPage));

    const [result] = await connection.execute(query, queryParams);

    // Prepare the response data structure
    const clientSummary = [];

    // Iterate over the result and organize the records by client, location, username, year, month, and date
    for (const record of result) {
      let clientData = clientSummary.find(
        (item) => item.client === record.clientName
      );

      if (!clientData) {
        clientData = {
          client: record.clientName,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        clientSummary.push(clientData);
      }

      let locationData = clientData.records.find(
        (item) => item.locationId === record.locationId
      );

      if (!locationData) {
        locationData = {
          location: record.location,
          locationId: record.locationId,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        clientData.records.push(locationData);
      }

      let rateData = locationData.records.find(
        (item) => item.rate === record.rate
      );

      if (!rateData) {
        rateData = {
          rate: record.rate,
          records: [],
          total: {
            shift: 0,
            hours: 0,
            cost: 0,
          },
        };
        locationData.records.push(rateData);
      }

      const formattedRecord = {
        rate: record.rate,
        timesheet_id: record.timesheet_id,
        hours: parseFloat(record.hours),
        cost: parseFloat(record.cost),
      };

      rateData.records.push(formattedRecord);

      if (!year && !month && !locationId && !rate && !clientId) {
        const rateSummaryTotalsQuery = `
      SELECT 
        COUNT(*) AS shiftCountRateSummary,
        SUM(hours) AS totalHoursRateSummary, 
        SUM(cost) AS totalCostRateSummary 
      FROM timesheet 
      WHERE rate = ? AND locationId = ? AND clientId = ?
      `;

        const [rateSummaryTotalsResult] = await connection.execute(
          rateSummaryTotalsQuery,
          [record.rate, record.locationId, record.clientId]
        );

        // Fetch the totals from the SQL result
        const {
          shiftCountRateSummary,
          totalHoursRateSummary,
          totalCostRateSummary,
        } = rateSummaryTotalsResult[0];

        // Update employeeData.total with the fetched totals
        rateData.total.shift = shiftCountRateSummary;
        rateData.total.hours = parseInt(totalHoursRateSummary);
        rateData.total.cost = parseInt(totalCostRateSummary);

        const locationSummaryTotalsQuery = `
      SELECT 
        COUNT(*) AS shiftCountLocationSummary,
        SUM(hours) AS totalHoursLocationSummary, 
        SUM(cost) AS totalCostLocationSummary 
      FROM timesheet 
      WHERE locationId = ? AND clientId = ?
      `;

        const [locationSummaryTotalsResult] = await connection.execute(
          locationSummaryTotalsQuery,
          [record.locationId, record.clientId]
        );

        // Fetch the totals from the SQL result
        const {
          shiftCountLocationSummary,
          totalHoursLocationSummary,
          totalCostLocationSummary,
        } = locationSummaryTotalsResult[0];

        // Update employeeData.total with the fetched totals
        locationData.total.shift = shiftCountLocationSummary;
        locationData.total.hours = parseInt(totalHoursLocationSummary);
        locationData.total.cost = parseInt(totalCostLocationSummary);

        const clientSummaryTotalsQuery = `
      SELECT 
        COUNT(*) AS shiftCount,
        SUM(hours) AS totalHours, 
        SUM(cost) AS totalCost 
      FROM timesheet 
      WHERE clientId = ?
      `;

        const [clientSummaryTotalsResult] = await connection.execute(
          clientSummaryTotalsQuery,
          [record.clientId]
        );

        // Fetch the totals from the SQL result
        const { shiftCount, totalHours, totalCost } =
          clientSummaryTotalsResult[0];

        // Update employeeData.total with the fetched totals
        clientData.total.shift = shiftCount;
        clientData.total.hours = parseInt(totalHours);
        clientData.total.cost = parseInt(totalCost);
      } else {
        rateData.total.shift++;
        rateData.total.hours += formattedRecord.hours;
        rateData.total.cost += formattedRecord.cost;

        locationData.total.shift++;
        locationData.total.hours += formattedRecord.hours;
        locationData.total.cost += formattedRecord.cost;

        clientData.total.shift++;
        clientData.total.hours += formattedRecord.hours;
        clientData.total.cost += formattedRecord.cost;
      }
    }

    if (result.length > 0) {
      const response = {
        reports: clientSummary,
        grandTotal: {
          shift: grandTotalShift,
          hours: grandTotalHours,
          cost: grandTotalCost,
        },
        pagination: {
          totalCount: totalCount,
          totalPages: totalPages,
          currentPage: parseInt(page) || 1,
          perPageCount: parseInt(perPage) || 0,
        },
      };

      res.status(200).json(response);
    } else {
      res.status(404).json({
        message: "No employees found",
      });
    }
  } catch (error) {
    console.error("Error retrieving employee information:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Timesheet Log ----------------------------------------------------------------------------------------

// Logs an action for a timesheet entry add (add, update, delete)
export const logAction = async (action, actionData, timesheetId, userId) => {
  try {
    // Construct the query to insert a new row into the timesheet_log table
    const logQuery = `
      INSERT INTO timesheet_log (action,actionData, timesheetId, createdBy)
      VALUES (?, ?, ?, ?)
    `;

    // Parameters to be inserted into the query
    const logParams = [action, actionData, timesheetId, userId];

    // Execute the query
    await connection.execute(logQuery, logParams);
  } catch (error) {
    console.error("Error logging action:", error);
    throw new Error("Error logging action");
  }
};

// Logs an action for a timesheet entry get (add, update, delete)
export const logActionView = async (req, res) => {
  try {
    const query = `
    SELECT 
      timesheet_log.*, 
      created_user.username AS createdByUsername
    FROM 
      timesheet_log
    LEFT JOIN 
      users AS created_user ON timesheet_log.createdBy = created_user.id
    ORDER BY 
      timesheet_log.id DESC
    `;
    const [result] = await connection.query(query);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving log:", error);
    res.status(500).json({ error: "Failed to retrieve log" });
  }
};

export const getShiftByID = async (req, res) => {
  const { timesheetId } = req.params;
  try {
    const query = `
    SELECT 
      *
    FROM 
      timesheet as timesheet
    JOIN timesheet_log as tsl on timesheet.timesheet_id = tsl.timesheetId
    JOIN events as evt on evt.id = timesheet.eventID
    JOIN users as usr on usr.id = timesheet.employeeId
    JOIN location as loc on loc.id = timesheet.locationId
    WHERE timesheet.timesheet_id = ?`;

    const [result] = await connection.query(query, [timesheetId]);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving log:", error);
    res.status(500).json({ error: "Failed to retrieve log" });
  }
};

// Schedule calendar ----------------------------------------------------------------------------------------

export const notificationSend = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Ensure dates are in a valid format
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Both startDate and endDate are required" });
    }

    // Fetch data between startDate and endDate
    const query = `
      SELECT t.employeeId, t.timesheet_id
      FROM timesheet t
      LEFT JOIN whatsapp_notifications w
      ON t.timesheet_id = w.timesheetId
      WHERE t.date BETWEEN ? AND ?
      AND w.timesheetId IS NULL
    `;

    // Execute the query
    const [results] = await connection.query(query, [startDate, endDate]);

    // Prepare data to be inserted
    const insertValues = results.map((row) => [
      row.employeeId,
      row.timesheet_id, // Assuming `timesheet_id` is the primary key of `timesheet`
      0, // Default status
      "create",
    ]);

    // Insert new entries
    if (insertValues.length > 0) {
      const insertQuery = `
        INSERT INTO whatsapp_notifications (employeeId, timesheetId, status, action_type)
        VALUES ?
      `;
      await connection.query(insertQuery, [insertValues]);
    }

    // Send success response
    res.status(200).json({ message: "Notifications sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
