import connection from "../index.js";

export const updateUserSettings = async (req, res) => {
    try {
        const { userId } = req.user;
        const { token, message_notification, dashboard_notification, newsfeed_notification } = req.body;

        // Basic validations
        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ message: "Valid token is required." });
        }

        const validBoolean = (val) => typeof val === 'boolean' || val === 0 || val === 1;

        if (!validBoolean(message_notification)) {
            return res.status(400).json({ message: "Invalid value for message_notification." });
        }

        if (!validBoolean(dashboard_notification)) {
            return res.status(400).json({ message: "Invalid value for dashboard_notification." });
        }

        if (!validBoolean(newsfeed_notification)) {
            return res.status(400).json({ message: "Invalid value for newsfeed_notification." });
        }

        const query = `
            UPDATE push_notification 
            SET message_notification = ?, dashboard_notification = ?, newsfeed_notification = ? 
            WHERE fcm_token = ? AND user_id = ?
        `;

        const [Result] = await connection.execute(query, [
            message_notification,
            dashboard_notification,
            newsfeed_notification,
            token,
            userId
        ]);

        if (Result.affectedRows === 0) {
            return res.status(404).json({ message: "No matching record found." });
        }

        return res.status(200).json({ message: "Notification settings updated successfully." });

    } catch (error) {
        console.error("Error updating user settings:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const getUserSettings = async (req, res) => {
    try {
        const { userId } = req.user;
        const { token } = req.query;

        // Validation
        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ message: "Valid token is required." });
        }

        const query = `
            SELECT * FROM push_notification 
            WHERE fcm_token = ? AND user_id = ?
        `;

        const [Result] = await connection.execute(query, [token, userId]);

        if (Result.length === 0) {
            return res.status(404).json({ message: "No settings found for the given token and user." });
        }

        return res.status(200).json( Result[0] );

    } catch (error) {
        console.error("Error fetching user settings:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};



