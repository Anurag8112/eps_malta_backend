import moment from "moment";
import puppeteer from "puppeteer-core";
import chromePaths from "chrome-paths";
import connection from "../index.js";
import dotenv from "dotenv";

dotenv.config();

// Function to calculate Grand Total from report data

const calculateGrandTotal = (reportData) => {
  let grandTotal = {
    shift: 0,
    hours: 0,
    cost: 0,
  };

  for (const report of reportData) {
    for (const rateWise of report.records) {
      for (const yearWise of rateWise.records) {
        for (const monthWise of yearWise.records) {
          for (const ratePerHourWise of monthWise.records) {
            for (const item of ratePerHourWise.records) {
              grandTotal.shift += parseInt(item.shift);
              grandTotal.hours += parseFloat(item.hours);
              grandTotal.cost += parseFloat(item.cost);
            }
          }
        }
      }
    }
  }

  return grandTotal;
};

// Function to generate PDF from report data
export const generatePdfFromData = async (reportData, TemplateData) => {
  const grandTotal = calculateGrandTotal(reportData);

  let isFirstRow = true; // Flag to keep track of the first row

  const tableContent = reportData
    .map((report) =>
      report.records
        .map((rateWise) =>
          rateWise.records
            .map((yearWise, yearIndex) =>
              yearWise.records
                .map((monthWise, monthIndex) =>
                  monthWise.records
                    .map((ratePerHourWise, ratePerHourIndex) =>
                      ratePerHourWise.records
                        .map((item, index) => {
                          const rowData = TemplateData.map((header) => {
                            switch (header) {
                              case "employeeId":
                                return isFirstRow ? report.username : "";
                              case "rate":
                                return yearIndex === 0 &&
                                  monthIndex === 0 &&
                                  ratePerHourIndex === 0 &&
                                  index === 0
                                  ? rateWise.rate === "normal"
                                    ? "Normal"
                                    : "Double"
                                  : "";
                              case "year":
                                return ratePerHourIndex === 0 &&
                                  monthIndex === 0 &&
                                  index === 0
                                  ? yearWise.year
                                  : "";
                              case "month":
                                return index === 0 && ratePerHourIndex === 0
                                  ? monthWise.month
                                  : "";
                              case "ratePerHour":
                                return index === 0
                                  ? Number(ratePerHourWise.ratePerHour).toFixed(
                                      2
                                    )
                                  : "";
                              case "date":
                                return moment(item.date).format("DD/MM/YYYY");
                              case "clientId":
                                return item.clientName !== null
                                  ? item.clientName
                                  : "N/A";
                              case "locationId":
                                return item.location;
                              case "eventId":
                                return item.event;
                              case "taskId":
                                return item.task;
                              case "startTime":
                                return moment(item.startTime, "HH:mm").format(
                                  "HH:mm"
                                );
                              case "endTime":
                                return moment(item.endTime, "HH:mm").format(
                                  "HH:mm"
                                );
                              case "rate":
                                return item.rate;
                              case "shift":
                                return "1"; // Assuming it's always 1 based on the provided code
                              case "hours":
                                return item.hours;
                              case "cost":
                                return item.cost;
                              case "week":
                                return item.week;
                              default:
                                return ""; // Handle any other headers if needed
                            }
                          });

                          isFirstRow = false; // Set the flag to false after the first row is processed

                          return `<tr key=${
                            item.timesheet_id
                          }><td>${rowData.join("</td><td>")}</td></tr>`;
                        })
                        .join("")
                    )
                    .join("")
                )
                .join("")
            )
            .join("")
        )
        .join("")
    )
    .join("");

  // Function to convert column names to user-friendly labels
  const getColumnLabel = (columnName) => {
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
      case "shift":
        return "Shift";
      case "hours":
        return "Hours";
      case "cost":
        return "Cost";
      default:
        return columnName;
    }
  };

  const tableHeaders = TemplateData.map(
    (columnName) => `<th>${getColumnLabel(columnName)}</th>`
  ).join("");

  // FOR ADJUST THE LAYOUT COLUMN LENGTH IS USED
  const colspan = TemplateData.length - 3;

  let totalShift = 0;

  for (const report of reportData) {
    totalShift += report.total.shift;
  }

  const query = "SELECT pdf_header_logo, pdf_footer_info FROM app_setting";
  const [result] = await connection.query(query);
  const firstUrl = result[0]?.pdf_header_logo;
  const logoImagePath = `${process.env.APP_PATH}/${firstUrl}`;
  const pdfFooterInfo = result[0]?.pdf_footer_info;

  // Format the PDF footer information
  const formattedFooterInfo = pdfFooterInfo
    .split("\n")
    .map((line) => {
      if (line.includes("@")) {
        // If the line contains an email address, format it as an anchor tag
        return `<a href="mailto:${line}">${line}</a>`;
      } else {
        // Otherwise, just return the line with spaces and line breaks
        return line.replace(/ /g, "&nbsp;") + "<br>";
      }
    })
    .join("");

  // const logoImagePath =
  //   "https://i0.wp.com/epsmalta.com/wp-content/uploads/2023/09/protection-services-malta-transparent-logo.png?resize=297%2C300&ssl=1";

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">    
      <title>Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
        }

        table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 40px; /* Add margin to push the table down */
        }

        th, td {
          border: 1px solid black;
          padding: 8px;
          text-align: center;
        }

        th {
          font-weight: bold;
        }
        h1 {
            text-align: center;
        }

        /* Add some space above the footer */
        #footer {
          margin-top: 20px;
        }


        /* Watermark-like effect for the logo */
        #watermark {
          position: absolute;
          top: 10px; /* Adjust the vertical position for top-left corner */
          left: 20px; /* Adjust the horizontal position for top-left corner */
          opacity: 0.8; /* Adjust the opacity for the watermark effect */
          width: 80px; /* Adjust the width as needed */
          height: 80px;/* Maintain aspect ratio */
        }
      </style>
    </head>
    <body>
    <img id="watermark" src="${logoImagePath}" alt="Company Logo" />
      <h1>Employee Report</h1>
      <table>
        <thead>
          <tr class="table-secondary">
            ${tableHeaders}
          </tr>
        </thead>
        <tbody>
          ${tableContent}
        </tbody>
        <tfoot>
          <tr style="border: 2px solid gray">
            <td colspan=${colspan}><b>Grand Total</b></td>
            <td><b>${totalShift.toFixed(0)}</b></td>
            <td><b>${grandTotal.hours.toFixed(2)}</b></td>
            <td><b>${grandTotal.cost.toFixed(2)}</b></td>
          </tr>
        </tfoot>
      </table>
      <!-- Footer content -->
      <div id="footer">
      ${formattedFooterInfo} 
      </div>
    </body>
    </html>
`;

  const executablePath = chromePaths.chrome || "/usr/bin/chromium-browser";
  console.log("Chrome executable path:", executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    // headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  // Set the content and generate PDF
  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({ format: "A4" });

  await browser.close();

  return pdfBuffer;
};

// client Pdf Generate Code

export const clientPdfGenerate = async (clientData, TemplateData) => {
  const grandTotal = calculateGrandTotal(clientData);

  let isFirstRow = true; // Flag to keep track of the first row
  const reportData = clientData;
  const tableContent = reportData
    .map((report) =>
      report.records
        .map((locationWise) =>
          locationWise.records
            .map((userRecord, userIndex) =>
              userRecord.records
                .map((yearWise, yearIndex) =>
                  yearWise.records
                    .map((monthWise, monthIndex) =>
                      monthWise.records
                        .map((ratePerHourWise, ratePerHourIndex) =>
                          ratePerHourWise.records
                            .map((item, index) => {
                              const rowData = TemplateData.map((header) => {
                                switch (header) {
                                  case "clientId":
                                    return isFirstRow
                                      ? report.client !== null
                                        ? report.client
                                        : "N/A"
                                      : "";
                                  case "locationId":
                                    return index === 0 &&
                                      userIndex === 0 &&
                                      yearIndex === 0 &&
                                      monthIndex === 0 &&
                                      ratePerHourIndex === 0
                                      ? locationWise.location
                                      : "";
                                  case "employeeId":
                                    return index === 0 &&
                                      yearIndex === 0 &&
                                      monthIndex === 0 &&
                                      ratePerHourIndex === 0
                                      ? userRecord.username
                                      : "";
                                  case "year":
                                    return monthIndex === 0 &&
                                      index === 0 &&
                                      ratePerHourIndex === 0
                                      ? yearWise.year
                                      : "";
                                  case "month":
                                    return index === 0 && ratePerHourIndex === 0
                                      ? monthWise.month
                                      : "";
                                  case "ratePerHour":
                                    return index === 0
                                      ? Number(item.ratePerHour).toFixed(2)
                                      : "";
                                  case "date":
                                    return moment(item.date).format(
                                      "DD/MM/YYYY"
                                    );
                                  case "rate":
                                    return item.rate === "normal"
                                      ? "Normal"
                                      : "Double";
                                  case "eventId":
                                    return item.event;
                                  case "taskId":
                                    return item.task;
                                  case "startTime":
                                    return moment(
                                      item.startTime,
                                      "HH:mm"
                                    ).format("HH:mm");
                                  case "endTime":
                                    return moment(item.endTime, "HH:mm").format(
                                      "HH:mm"
                                    );
                                  case "week":
                                    return item.week;
                                  case "shift":
                                    return "1"; // Assuming it's always 1 based on the provided code
                                  case "hours":
                                    return item.hours;
                                  case "cost":
                                    return item.cost;
                                  default:
                                    return ""; // Handle any other headers if needed
                                }
                              });

                              isFirstRow = false; // Set the flag to false after the first row is processed

                              return `<tr key=${
                                item.timesheet_id
                              }><td>${rowData.join("</td><td>")}</td></tr>`;
                            })
                            .join("")
                        )
                        .join("")
                    )
                    .join("")
                )
                .join("")
            )
            .join("")
        )
        .join("")
    )
    .join("");

  // Function to convert column names to user-friendly labels
  const getColumnLabel = (columnName) => {
    switch (columnName) {
      case "clientId":
        return "Client";
      case "locationId":
        return "Location";
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
      case "rate":
        return "Rate";
      case "eventId":
        return "Event";
      case "taskId":
        return "Task";
      case "startTime":
        return "Start Time";
      case "endTime":
        return "End Time";
      case "shift":
        return "Shift";
      case "hours":
        return "Hours";
      case "cost":
        return "Cost";
      default:
        return columnName;
    }
  };

  const tableHeaders = TemplateData.map(
    (columnName) => `<th>${getColumnLabel(columnName)}</th>`
  ).join("");

  const colspan = TemplateData.length - 3;

  let totalShift = 0;
  let totalHours = 0;
  let totalCost = 0;
  for (const report of clientData) {
    totalShift += report.total.shift;
    totalHours += report.total.hours;
    totalCost += report.total.cost;
  }

  const query = "SELECT pdf_header_logo, pdf_footer_info FROM app_setting";
  const [result] = await connection.query(query);
  const firstUrl = result[0]?.pdf_header_logo;
  const logoImagePath = `${process.env.APP_PATH}/${firstUrl}`;
  const pdfFooterInfo = result[0]?.pdf_footer_info;

  // Format the PDF footer information
  const formattedFooterInfo = pdfFooterInfo
    .split("\n")
    .map((line) => {
      if (line.includes("@")) {
        // If the line contains an email address, format it as an anchor tag
        return `<a href="mailto:${line}">${line}</a>`;
      } else {
        // Otherwise, just return the line with spaces and line breaks
        return line.replace(/ /g, "&nbsp;") + "<br>";
      }
    })
    .join("");
  // const logoImagePath =
  //   "https://i0.wp.com/epsmalta.com/wp-content/uploads/2023/09/protection-services-malta-transparent-logo.png?resize=297%2C300&ssl=1";

  const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">    
        <title>Client Report</title>
        <style>
           body {
              font-family: Arial, sans-serif;
            }

            table {
              border-collapse: collapse;
              width: 100%;
              margin-top: 40px;
            }

            th, td {
              border: 1px solid black;
              padding: 8px;
              text-align: center;
            }

            th {
              font-weight: bold;
            }
            h1 {
                text-align: center;
            }

            /* Add some space above the footer */
            #footer {
              margin-top: 20px;
            }

            /* Watermark-like effect for the logo */
            #watermark {
              position: absolute;
              top: 10px; /* Adjust the vertical position for top-left corner */
              left: 20px; /* Adjust the horizontal position for top-left corner */
              opacity: 0.8; /* Adjust the opacity for the watermark effect */
              width: 80px; /* Adjust the width as needed */
              height: 80px;/* Maintain aspect ratio */
            }
          </style>
      </head>
      <body>
      <img id="watermark" src="${logoImagePath}" alt="Company Logo" />
        <h1>Client Report - ${clientData[0].client}</h1>
        <table>
          <thead>
            <tr class="table-secondary">
            ${tableHeaders}
            </tr>
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
          <tfoot>
            <tr style="border: 2px solid gray">
              <td colspan=${colspan}><b>Grand Total</b></td>
              <td><b>${totalShift.toFixed(0)}</b></td>
              <td><b>${totalHours.toFixed(2)}</b></td>
              <td><b>${totalCost.toFixed(2)}</b></td>
            </tr>
          </tfoot>
        </table>
        <!-- Footer content -->
        <div id="footer">
        ${formattedFooterInfo} 
        </div>
      </body>
      </html>
    `;

  const executablePath = chromePaths.chrome || "/usr/bin/chromium-browser";
  console.log("Chrome executable path:", executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    // headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  // Set the content and generate PDF
  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({ format: "A4" });

  await browser.close();

  return pdfBuffer;
};
