import cron from "node-cron";
import { clientPdfGenerate, generatePdfFromData } from "../Service/report.js";
import { sendMail } from "../Service/SendMail.js";
import connection from "../index.js";
import { whatsappScheduler } from "./whatsappScheduler.js";
// import archiver from "archiver";

export const emailScheduler = async () => {
  try {
    const queueQuery =
      "SELECT status, action_parameters FROM queue_worker WHERE status = '0' AND action = 'send'";

    const [queueRows] = await connection.query(queueQuery);

    const result = {
      reports: [],
    };

    if (queueRows.length > 0 && queueRows[0].status === "0") {
      const actionParameters = queueRows.map((row) =>
        JSON.parse(row.action_parameters)
      );

      const conditions = actionParameters.map((params) => {
        const conditionsArray = [];
        if (params.year) {
          conditionsArray.push(`timesheet.year = '${params.year}'`);
        }
        if (params.month) {
          conditionsArray.push(`timesheet.month = '${params.month}'`);
        }
        if (params.employeeId) {
          conditionsArray.push(`timesheet.employeeId = '${params.employeeId}'`);
        }
        if (params.locationId) {
          conditionsArray.push(`timesheet.locationId = '${params.locationId}'`);
        }
        if (params.eventId) {
          conditionsArray.push(`timesheet.eventId = '${params.eventId}'`);
        }
        if (params.taskId) {
          conditionsArray.push(`timesheet.taskId = '${params.taskId}'`);
        }
        if (params.clientId) {
          conditionsArray.push(`timesheet.clientId = '${params.clientId}'`);
        }
        if (params.rate) {
          conditionsArray.push(`timesheet.rate = '${params.rate}'`);
        }
        if (params.ratePerHour) {
          // Split the ratePerHour string into an array of values
          const ratePerHourValues = params.ratePerHour.split(",");
          // Create conditions for each ratePerHour value
          const rateConditions = ratePerHourValues.map(
            (rate) => `timesheet.ratePerHour = '${rate}'`
          );
          // Join the rate conditions with OR since any of them might match
          conditionsArray.push(`(${rateConditions.join(" OR ")})`);
        }
        return conditionsArray.join(" AND ");
      });

      const combinedConditions = conditions.join(" OR ");

      let timesheetQuery = `
        SELECT timesheet.*, users.username, users.email, location.location, events.events, tasks.tasks, client.clientName, client.email as clientEmail
        FROM timesheet
        INNER JOIN users ON timesheet.employeeId = users.id
        INNER JOIN location ON timesheet.locationId = location.id
        INNER JOIN events ON timesheet.eventId = events.id
        INNER JOIN tasks ON timesheet.taskId = tasks.id
        INNER JOIN client ON timesheet.clientId = client.id
      `;
      if (combinedConditions) {
        timesheetQuery += ` WHERE ${combinedConditions}`;
      }

      const [timesheetRows] = await connection.query(timesheetQuery);

      const reports = [];

      for (const row of timesheetRows) {
        const report = reports.find((r) => r.username === row.username);
        const formattedRecord = {
          date: row.date,
          location: row.location,
          event: row.events,
          task: row.tasks,
          clientName: row.clientName,
          timesheet_id: row.timesheet_id,
          startTime: row.startTime,
          endTime: row.endTime,
          ratePerHour: row.ratePerHour,
          hours: row.hours,
          week: row.week,
          cost: row.cost,
          locationId: row.locationId,
          eventId: row.eventId,
          taskId: row.taskId,
          rate: row.rate,
          clientId: row.clientId,
          username: row.username,
          employeeId: row.employeeId,
        };
        if (report) {
          const existingRate = report.records.find((r) => r.rate === row.rate);
          if (existingRate) {
            const existingYear = existingRate.records.find(
              (r) => r.year === row.year
            );
            if (existingYear) {
              const existingMonth = existingYear.records.find(
                (r) => r.month === row.month
              );
              if (existingMonth) {
                const existingRatePerHour = existingMonth.records.find(
                  (r) => r.ratePerHour === row.ratePerHour
                );
                if (existingRatePerHour) {
                  existingRatePerHour.records.push(formattedRecord);
                } else {
                  existingMonth.records.push({
                    ratePerHour: row.ratePerHour,
                    records: [formattedRecord],
                  });
                }
              } else {
                existingYear.records.push({
                  month: row.month,
                  records: [
                    {
                      ratePerHour: row.ratePerHour,
                      records: [formattedRecord],
                    },
                  ],
                });
              }
            } else {
              existingRate.records.push({
                year: row.year,
                records: [
                  {
                    month: row.month,
                    records: [
                      {
                        ratePerHour: row.ratePerHour,
                        records: [formattedRecord],
                      },
                    ],
                  },
                ],
              });
            }
          } else {
            report.records.push({
              rate: row.rate,
              records: [
                {
                  year: row.year,
                  records: [
                    {
                      month: row.month,
                      records: [
                        {
                          ratePerHour: row.ratePerHour,
                          records: [formattedRecord],
                        },
                      ],
                    },
                  ],
                },
              ],
            });
          }
          // Update totals
          report.total.shift++;
          report.total.hours += parseFloat(row.hours);
          report.total.cost += parseFloat(row.cost);
        } else {
          // Create a new report entry
          reports.push({
            username: row.username,
            email: row.email,
            clientEmail: row.clientEmail,
            records: [
              {
                rate: row.rate,
                records: [
                  {
                    year: row.year,
                    records: [
                      {
                        month: row.month,
                        records: [
                          {
                            ratePerHour: row.ratePerHour,
                            records: [formattedRecord],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
            total: {
              shift: 1,
              hours: parseFloat(row.hours),
              cost: parseFloat(row.cost),
            },
          });
        }
      }

      // Select template for download reports.
      const tempQuery = "SELECT timesheetName FROM template WHERE id = ?";
      const [result] = await connection.query(tempQuery, [
        actionParameters[0].titleId,
      ]);
      const tempString = result[0].timesheetName;

      const template = tempString
        .split(",")
        .map((columnName) => columnName.trim());

      // EMAIL SENT TO CLIENT WITH ZIP ATTECHMENT --------------------------
      result.reports = reports;

      // Send the email with the zip attachment
      if (reports.length > 0 && reports[0].email) {
        for (const report of reports) {
          const pdfBuffer = await generatePdfFromData([report], template);

          const username = `${report.username} report.pdf` || "employee";
          const emailSubject = "Important: Your Monthly Employee Report";
          const emailText = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Monthly Employee Report</title>
          </head>
          <body>
            <p>Dear ${report.username},</p>
            <p>We hope this message finds you well. As a valued member of our team, we are pleased to provide you with your monthly employee report.</p>
            <p>Please find attached the detailed report that highlights your contributions, achievements, and areas for growth. We believe that reviewing this report will aid in your professional development and allow you to set meaningful goals.</p>
            <p>Your dedication and hard work continue to drive the success of our company, and we appreciate your commitment to excellence.</p>
            <p>Should you have any questions or require further clarification about the report, please do not hesitate to reach out to your supervisor or the HR department.</p>
            <p>Thank you for being an integral part of our team.</p>
            <p>Best regards,<br/>[Your Company's Name]</p>
          </body>
          </html>
          `;

          try {
            await sendMail(
              report.email,
              emailSubject,
              emailText,
              pdfBuffer,
              username
            );
            console.log(`Email sent to ${report.email}`);
            const updateStatusQuery =
              "UPDATE queue_worker SET status = '1' WHERE status = '0'";
            await connection.query(updateStatusQuery);
            console.log("Status updated to '1' in the queue_worker table.");
          } catch (error) {
            console.error(`Error sending email to ${report.email}:`, error);
          }
        }
      } else {
        console.log("No email found");
      }
    } else {
      console.log("No records are available; all statuses are '0'.");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
};

export const clientEmailScheduler = async () => {
  try {
    const queueQuery =
      "SELECT status, action_parameters FROM queue_worker WHERE status = '0' AND action = 'send-client'";

    const [queueRows] = await connection.query(queueQuery);

    const result = {
      reports: [],
    };

    if (queueRows.length > 0 && queueRows[0].status === "0") {
      const actionParameters = queueRows.map((row) =>
        JSON.parse(row.action_parameters)
      );

      const conditions = actionParameters.map((params) => {
        const conditionsArray = [];
        if (params.year) {
          conditionsArray.push(`timesheet.year = '${params.year}'`);
        }
        if (params.month) {
          conditionsArray.push(`timesheet.month = '${params.month}'`);
        }
        if (params.employeeId) {
          conditionsArray.push(`timesheet.employeeId = '${params.employeeId}'`);
        }
        if (params.locationId) {
          conditionsArray.push(`timesheet.locationId = '${params.locationId}'`);
        }
        if (params.eventId) {
          conditionsArray.push(`timesheet.eventId = '${params.eventId}'`);
        }
        if (params.taskId) {
          conditionsArray.push(`timesheet.taskId = '${params.taskId}'`);
        }
        if (params.clientId) {
          conditionsArray.push(`timesheet.clientId = '${params.clientId}'`);
        }
        if (params.rate) {
          conditionsArray.push(`timesheet.rate = '${params.rate}'`);
        }
        if (params.ratePerHour) {
          // Split the ratePerHour string into an array of values
          const ratePerHourValues = params.ratePerHour.split(",");
          // Create conditions for each ratePerHour value
          const rateConditions = ratePerHourValues.map(
            (rate) => `timesheet.ratePerHour = '${rate}'`
          );
          // Join the rate conditions with OR since any of them might match
          conditionsArray.push(`(${rateConditions.join(" OR ")})`);
        }
        return conditionsArray.join(" AND ");
      });

      const combinedConditions = conditions.join(" OR ");

      let timesheetQuery = `
        SELECT timesheet.*, users.username, users.email, location.location, events.events, tasks.tasks, client.clientName, client.email as clientEmail
        FROM timesheet
        INNER JOIN users ON timesheet.employeeId = users.id
        INNER JOIN location ON timesheet.locationId = location.id
        INNER JOIN events ON timesheet.eventId = events.id
        INNER JOIN tasks ON timesheet.taskId = tasks.id
        INNER JOIN client ON timesheet.clientId = client.id
      `;
      if (combinedConditions) {
        timesheetQuery += ` WHERE ${combinedConditions}`;
      }

      const [timesheetRows] = await connection.query(timesheetQuery);

      const reports = [];
      const grandTotal = {
        shift: 0,
        hours: 0,
        cost: 0,
      };

      for (const row of timesheetRows) {
        let clientData = reports.find((item) => item.client === row.clientName);

        if (!clientData) {
          clientData = {
            client: row.clientName,
            clientEmail: row.clientEmail,
            records: [],
            total: {
              shift: 0,
              hours: 0,
              cost: 0,
            },
          };
          reports.push(clientData);
        }

        let locationData = clientData.records.find(
          (item) => item.locationId === row.locationId
        );

        if (!locationData) {
          locationData = {
            location: row.location,
            locationId: row.locationId,
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
          (item) => item.username === row.username
        );

        if (!userData) {
          userData = {
            username: row.username,
            records: [],
          };
          locationData.records.push(userData);
        }

        let yearData = userData.records.find((item) => item.year === row.year);

        if (!yearData) {
          yearData = {
            year: row.year,
            records: [],
          };
          userData.records.push(yearData);
        }

        let monthData = yearData.records.find(
          (item) => item.month === row.month
        );

        if (!monthData) {
          monthData = {
            month: row.month,
            records: [],
          };
          yearData.records.push(monthData);
        }

        let ratePerHourData = monthData.records.find(
          (item) => item.ratePerHour === row.ratePerHour
        );

        if (!ratePerHourData) {
          ratePerHourData = {
            ratePerHour: row.ratePerHour,
            records: [],
          };
          monthData.records.push(ratePerHourData);
        }

        const formattedRecord = {
          date: row.date,
          rate: row.rate,
          event: row.events,
          task: row.tasks,
          timesheet_id: row.timesheet_id,
          startTime: row.startTime,
          endTime: row.endTime,
          ratePerHour: row.ratePerHour,
          hours: parseFloat(row.hours),
          cost: parseFloat(row.cost),
        };

        ratePerHourData.records.push(formattedRecord);

        locationData.total.shift++;
        locationData.total.hours += formattedRecord.hours;
        locationData.total.cost += formattedRecord.cost;

        clientData.total.shift++;
        clientData.total.hours += formattedRecord.hours;
        clientData.total.cost += formattedRecord.cost;

        // You should ensure that "grandTotal" is properly initialized before this loop
        grandTotal.shift++;
        grandTotal.hours += formattedRecord.hours;
        grandTotal.cost += formattedRecord.cost;
      }

      // Select template for download reports.
      const tempQuery = "SELECT timesheetName FROM template WHERE id = ?";
      const [templateResult] = await connection.query(tempQuery, [
        actionParameters[0].titleId,
      ]);
      const tempString = templateResult[0].timesheetName;

      const template = tempString
        .split(",")
        .map((columnName) => columnName.trim());

      if (reports.length > 0 && reports[0].clientEmail) {
        for (const report of reports) {
          const pdfBuffer = await clientPdfGenerate([report], template);

          const username = `${report.client} report.pdf` || "client";
          const emailSubject = "Important: Your Monthly Employee Report";
          const emailText = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Monthly Employee Report</title>
          </head>
          <body>
            <p>Dear ${report.client},</p>
            <p>We hope this message finds you well. As a valued member of our team, we are pleased to provide you with your monthly employee report.</p>
            <p>Please find attached the detailed report that highlights your contributions, achievements, and areas for growth. We believe that reviewing this report will aid in your professional development and allow you to set meaningful goals.</p>
            <p>Your dedication and hard work continue to drive the success of our company, and we appreciate your commitment to excellence.</p>
            <p>Should you have any questions or require further clarification about the report, please do not hesitate to reach out to your supervisor or the HR department.</p>
            <p>Thank you for being an integral part of our team.</p>
            <p>Best regards,<br/>[Your Company's Name]</p>
          </body>
          </html>
          `;

          try {
            await sendMail(
              report.clientEmail,
              emailSubject,
              emailText,
              pdfBuffer,
              username
            );
            console.log(`Email sent to ${report.clientEmail}`);
            const updateStatusQuery =
              "UPDATE queue_worker SET status = '1' WHERE status = '0'";
            await connection.query(updateStatusQuery);
            console.log("Status updated to '1' in the queue_worker table.");
          } catch (error) {
            console.error(
              `Error sending email to ${report.clientEmail}:`,
              error
            );
          }
        }
      }
    } else {
      console.log("No records are available for client; all statuses are '0'.");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
};

//------------------------------------------licenseStatusScheculer-------------------------------

export const licenseStatusScheculer = async () => {
  try {
    const query = `
    SELECT tracker_archive.*, users.username
    FROM tracker_archive
    INNER JOIN users ON tracker_archive.employeeId = users.id
    WHERE tracker_archive.status IN (1, 2)
  `;

    const [results] = await connection.query(query);

    const formattedResults = await Promise.all(
      results.map(async (row) => {
        // Calculate the expiry date
        const expDate = new Date(row.exp_date);

        // Calculate the number of days left
        const today = new Date();
        const daysLeft = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
        // console.log("first",daysLeft)
        const { tracker_id, employeeId, exp_date } = row;
        const mailType = getMailType(daysLeft);

        // Update the status in tracker_archive based on daysLeft
        let newStatus;

        if (daysLeft <= 90 && daysLeft > 0) {
          newStatus = 2;
        } else if (daysLeft <= 0) {
          newStatus = 3;
        }

        if (newStatus !== undefined) {
          const updateStatusQuery =
            "UPDATE tracker_archive SET status = ? WHERE tracker_id = ?";
          await connection.query(updateStatusQuery, [newStatus, tracker_id]);
        }

        // Check if a corresponding entry exists in the notification_log table
        const logEntryExists = await checkLogEntryExists(
          connection,
          tracker_id,
          employeeId,
          mailType,
          exp_date
        );

        let emailSent = false;

        if (!logEntryExists && mailType) {
          // Fetch the email template based on daysLeft from the email_template table
          const emailTemplate = await getEmailTemplate(mailType);
          // console.log("EMailTemplate", emailTemplate);

          if (emailTemplate) {
            const emailSubject = `${emailTemplate.subject}`;
            const emailText = `${emailTemplate.body.replace(
              /\[username\]/g,
              row.username
            )}`;

            await sendMail(row.email, emailSubject, emailText);
            console.log("Email Sent Successfully License");
            emailSent = true;

            // Insert a log entry
            const insertQuery = `INSERT INTO notification_log (licenseId, employeeId, mail_type, exp_date) VALUES (?, ?, ?, ?)`;
            await connection.query(insertQuery, [
              row.tracker_id,
              employeeId,
              mailType,
              exp_date,
            ]);
            console.log("Data inserted into notification_log");
          }
        }
      })
    );

    console.log("License Expiring notification system");
  } catch (error) {
    console.error("Error retrieving or sending emails:", error);
  }
};

// Function to determine the mail_type based on daysLeft
function getMailType(daysLeft) {
  if (daysLeft === 90) {
    return "90_days";
  } else if (daysLeft === 60) {
    return "60_days";
  } else if (daysLeft === 30) {
    return "30_days";
  } else {
    return null;
  }
}

// Function to check if a log entry exists in the notification_log table
async function checkLogEntryExists(
  connection,
  licenseId,
  employeeId,
  mailType,
  exp_date
) {
  const query =
    "SELECT * FROM notification_log WHERE licenseId = ? AND employeeId = ? AND mail_type = ? AND exp_date = ?";
  const [results] = await connection.query(query, [
    licenseId,
    employeeId,
    mailType,
    exp_date,
  ]);
  return results.length > 0;
}

// Function to fetch email template from the email_template table
const getEmailTemplate = async (mailType) => {
  const query = "SELECT * FROM email_template WHERE type = ?";
  const [results] = await connection.query(query, [mailType]);
  console.log(results);
  return results[0]; // Assuming there's only one template per mail type
};

// Set up the cron job to run the emailScheduler function every 2 min
cron.schedule("*/2 * * * *", async () => {
  await emailScheduler();
  await clientEmailScheduler();
  await licenseStatusScheculer();
  await whatsappScheduler();
});
