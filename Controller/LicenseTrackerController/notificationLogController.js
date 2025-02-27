import connection from "../../index.js";

// GET || API
export const getNotificationLog = async (req, res) => {
  try {
    const query = `
      SELECT notification_log.*, users.username
      FROM notification_log
      INNER JOIN users ON notification_log.employeeId = users.id
      ORDER BY notification_log.id DESC`;

    const [result] = await connection.query(query);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve Data" });
  }
};
