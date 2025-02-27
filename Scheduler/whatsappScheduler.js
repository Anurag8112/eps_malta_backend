import moment from "moment";
import connection from "../index.js";
import { sendWhatsAppMessage } from "../Service/whatsappNotification.js";

// Function to fetch data from the whatsapp_notifications table and include additional related data
export const whatsappScheduler = async () => {
  try {
    // Define the query to fetch notifications along with the timesheet data and related details
    const query = `
      SELECT 
        wn.id,
        wn.employeeId,
        u.username AS username,
        u.mobile AS mobile,
        wn.timesheetId,
        wn.status,
        wn.action_type,
        wn.createdAt,
        wn.lastModifiedAt,
        ts.date,
        ts.clientId,
        c.clientName AS clientName,
        ts.locationId,
        l.location AS locationName,
        ts.eventId,
        e.events AS eventName,
        ts.taskId,
        t.tasks AS taskName,
        ts.startTime,
        ts.endTime,
        ts.ratePerHour,
        ts.hours,
        ts.cost
      FROM whatsapp_notifications wn
      JOIN timesheet ts ON wn.timesheetId = ts.timesheet_id
      JOIN users u ON wn.employeeId = u.id
      JOIN location l ON ts.locationId = l.id
      JOIN client c ON ts.clientId = c.id
      JOIN events e ON ts.eventId = e.id
      JOIN tasks t ON ts.taskId = t.id
      WHERE wn.status = 0
    `;

    // Execute the query
    const [rows] = await connection.query(query);

    if (rows.length === 0) {
      console.log("No pending WhatsApp notifications found.");
      return; // Exit early if there are no notifications to process
    }

    // Process each notification
    for (const row of rows) {
      try {
        // Skip sending if mobile number is null or empty
        if (!row.mobile) {
          console.log(
            `Skipping notification ${row.id}: No mobile number provided.`
          );
          continue; // Skip this notification
        }

        // Prepare parameters for the template
        const parameters = [
          moment(row.startTime, "HH:mm:ss").format("h:mm A"),
          moment(row.endTime, "HH:mm:ss").format("h:mm A"),
          row.hours,
          row.eventName,
          row.taskName,
          row.locationName,
          row.username,
        ];

        // Send the formatted message via WhatsApp using the template
        await sendWhatsAppMessage(row.mobile, parameters, row.action_type);

        // Update the status of the notification after sending
        await updateNotificationStatus(row.id);
      } catch (error) {
        // Log error and skip this entry if sending fails
        console.error(
          `Error sending WhatsApp message for notification ${row.id}:`,
          error.message
        );
        // Do not update status if message sending fails
      }
    }

    console.log("All messages sent and statuses updated successfully.");
  } catch (error) {
    console.error("Error fetching notifications and sending messages:", error);
  }
};

// Function to update the status of a notification to '1' after sending
async function updateNotificationStatus(notificationId) {
  const updateQuery = `
    UPDATE whatsapp_notifications
    SET status = 1
    WHERE id = ?
  `;

  try {
    await connection.query(updateQuery, [notificationId]);
    console.log(`Notification ${notificationId} status updated to 1.`);
  } catch (error) {
    console.error(
      `Error updating status for notification ${notificationId}:`,
      error
    );
  }
}
