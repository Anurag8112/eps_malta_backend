import connection from "../index.js";

export const sendApplicationFeedback = async (req, res) => {
  try {
    const { rating, message } = req.body;
    const { userId } = req.user;

    // Validate inputs
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Invalid rating. It must be between 1 and 5." });
    }
    if (!message || message.trim() === "") {
      return res.status(400).json({ success: false, message: "Message cannot be empty." });
    }

    // SQL Query
    const query = `
      INSERT INTO feedback (user_id, rating, message, created_at) 
      VALUES (?, ?, ?, NOW())`;

    const [result] = await connection.query(query, [userId, rating, message]);

    if (result.affectedRows > 0) {
      return res.status(201).json({
        success: true,
        message: "Feedback submitted successfully",
        feedbackId: result.insertId
      });
    }

    res.status(500).json({ success: false, message: "Failed to submit feedback" });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
