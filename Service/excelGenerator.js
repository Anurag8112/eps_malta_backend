import ExcelJS from "exceljs";

export const generateExcelFromData = async (reports, template) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("TimeSheet");

  // Map column names to user-friendly headers
  const headerRow = template.map((columnName) => {
    switch (columnName) {
      case "employeeId":
        return "Employee Name";
      case "year":
        return "Year";
      case "month":
        return "Month";
      case "ratePerHour":
        return "R P H";
      case "date":
        return "Date";
      case "locationId":
        return "Location";
      case "eventId":
        return "Event";
      case "taskId":
        return "Task";
      case "startTime":
        return "Start Time";
      case "endTime":
        return "End Time";
      case "clientId":
        return "Client";
      case "week":
        return "Week";
      case "rate":
        return "Rate";
      case "cost":
        return "Cost";
      case "hours":
        return "Hours";
      case "invoiced":
        return "Invoiced";
      case "createdBy":
        return "Created By";
      case "createdAt":
        return "Created At";
      case "lastModifiedBy":
        return "LastModified By";
      case "lastModifiedAt":
        return "LastModified At";
      default:
        return columnName;
    }
  });

  // Add header row based on mapped headers
  worksheet.addRow(headerRow);

  // Add data rows with user-friendly values
  reports.forEach((report) => {
    const row = template.map((columnName) => {
      switch (columnName) {
        case "employeeId":
          return report.username;
        case "eventId":
          return report.events;
        case "taskId":
          return report.tasks;
        case "locationId":
          return report.location;
        case "clientId":
          return report.clientName;
        case "invoiced":
          return report.invoiced;
        default:
          return report[columnName] || "";
      }
    });
    worksheet.addRow(row);
  });

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export const generateExcelFromTemplate = async () => {
  const workbook = new ExcelJS.Workbook();

  // Import template sheet
  const importSheet = workbook.addWorksheet("Import");
  importSheet.addRow([
    "Employee Name",
    "Email",
    "Date",
    "Client",
    "Client Email",
    "Location",
    "Event",
    "Task",
    "Start Time",
    "R P H",
    "Hours",
    "Is Public Holiday",
  ]);

  // Instructions sheet
  const instructionsSheet = workbook.addWorksheet("Instructions");
  const headerStyle = { font: { bold: true } };

  instructionsSheet
    .addRow([
      "Employee Name",
      "Email",
      "Date (MM/DD/YYYY)",
      "Client",
      "Client Email",
      "Location",
      "Event",
      "Task",
      "Start Time (Decimal Format)",
      "R P H",
      "Hours",
      "Is Public Holiday (TRUE/FALSE)",
    ])
    .eachCell({ includeEmpty: true }, (cell) => {
      cell.style = headerStyle;
    });
  instructionsSheet.addRow([
    "John Doe",
    "john.doe@example.com",
    "07/01/2024",
    "Acme Corp",
    "client1@acme.com",
    "New York",
    "Conference",
    "Setup",
    "0.375",
    "10",
    "8",
    "FALSE",
  ]);
  instructionsSheet.addRow([
    "Jane Smith",
    "jane.smith@example.com",
    "07/01/2024",
    "Beta Ltd",
    "client2@beta.com",
    "Los Angeles",
    "Workshop",
    "Presentation",
    "0.41667",
    "5.5",
    "6",
    "FALSE",
  ]);
  instructionsSheet.addRow([
    "Bob Johnson",
    "bob.johnson@example.com",
    "07/22/2024",
    "Gamma Inc",
    "client3@gamma.com",
    "Chicago",
    "Meeting",
    "Negotiation",
    "0.54167",
    "12",
    "4",
    "FALSE",
  ]);
  instructionsSheet.addRow([
    "Alice Brown",
    "alice.brown@example.com",
    "07/02/2024",
    "Delta Co",
    "client4@delta.com",
    "Houston",
    "Seminar",
    "Coordination",
    "0.45833",
    "11",
    "7",
    "FALSE",
  ]);
  instructionsSheet.addRow([
    "Charlie Black",
    "charlie.black@example.com",
    "03/20/2024",
    "Epsilon LLC",
    "client5@epsilon.com",
    "Miami",
    "Training",
    "Facilitation",
    "0.58333",
    "10.5",
    "5",
    "TRUE",
  ]);
  instructionsSheet.addRow([]);

  instructionsSheet
    .addRow(["Instructions for Importing Timesheet Data"])
    .eachCell({ includeEmpty: true }, (cell) => {
      cell.style = headerStyle;
    });
  instructionsSheet.addRow([]);
  instructionsSheet.addRow([
    "1. Fill in the data according to the template provided in the sheet.",
  ]);
  instructionsSheet.addRow(["2. Ensure dates are in the format MM/DD/YYYY."]);
  instructionsSheet.addRow([
    "3. Times should be in decimal format, where 0 = Midnight, 0.25 = 6:00 AM, 0.5 = Noon, 0.75 = 6:00 PM.",
  ]);
  instructionsSheet.addRow([
    "4. Use TRUE or FALSE for the Is Public Holiday field.",
  ]);
  instructionsSheet.addRow([
    "5. Save the file and upload it to the import system.",
  ]);

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};
