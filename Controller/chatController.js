import connection from "../index.js";

export const createConversations = async (req, res) => {
    try {
        const { type, participants, conversationName } = req.body;

        // Validate type
        if (!["private", "group"].includes(type)) {
            return res.status(400).json({ error: "Invalid type. Type must be either 'private' or 'group'." });
        }

        // Validate participants array
        if (!Array.isArray(participants) || participants.length < 2) {
            return res.status(400).json({ error: "Participants must be an array with at least 2 users." });
        }

        const currentUserId = req.user.userId;

        // Private conversation validation
        if (type === "private") {
            if (participants.length !== 2) {
                return res.status(400).json({ error: "Private conversations must have exactly 2 participants." });
            }
            if (!participants.includes(currentUserId)) {
                return res.status(400).json({ error: "Authenticated user must be one of the participants in a private conversation." });
            }
        }

        let finalConversationName = conversationName || null;

        // For private conversations, set conversationName to NULL and validate other participant
        if (type === "group") {
            // Validate conversationName for group chats
            if (!conversationName || typeof conversationName !== "string" || conversationName.trim().length === 0) {
                return res.status(400).json({ error: "conversationName is required for group chats and must be a valid string." });
            }
            if (conversationName.length > 100) {
                return res.status(400).json({ error: "conversationName must not exceed 100 characters." });
            }
        }

        // Insert into conversations table
        const [conversationResult] = await connection.execute(
            "INSERT INTO conversations (`type`, conversation_name, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            [type, finalConversationName]
        );

        const conversationId = conversationResult.insertId;

        // Insert into conversation_participants table
        const participantValues = participants.map(userId => [conversationId, userId]);
        await connection.query(
            "INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?",
            [participantValues]
        );

        res.status(201).json({ conversationId, type, conversationName: finalConversationName, participants });
    } catch (err) {
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
};

export const getConversations = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized. User authentication required." });
        }

        const currentUserId = req.user.userId;

        // Fetch the user's role from the database
        const [userRoleResult] = await connection.execute(
            "SELECT role FROM users WHERE id = ?",
            [currentUserId]
        );

        if (userRoleResult.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const userRole = userRoleResult[0].role;

        const query = `
            SELECT 
                c.id AS conversation_id, 
                c.type, 
                c.created_at,
                CASE 
                    -- If private chat and admin is NOT a participant, concat all usernames
                    WHEN c.type = 'private' AND ? = 1 AND NOT EXISTS (
                        SELECT 1 
                        FROM conversation_participants cp_admin 
                        WHERE cp_admin.conversation_id = c.id AND cp_admin.user_id = ?
                    ) THEN (
                        SELECT GROUP_CONCAT(u.username ORDER BY u.username SEPARATOR ', ') 
                        FROM users u 
                        JOIN conversation_participants cp ON u.id = cp.user_id 
                        WHERE cp.conversation_id = c.id
                    )
                    -- If private chat and admin is a participant, behave like a normal private chat
                    WHEN c.type = 'private' THEN (
                        SELECT u.username 
                        FROM users u 
                        JOIN conversation_participants cp ON u.id = cp.user_id 
                        WHERE cp.conversation_id = c.id AND u.id != ?
                        LIMIT 1
                    )
                    -- If group chat and conversation_name is NULL, concat all usernames
                    WHEN c.type = 'group' AND c.conversation_name IS NULL THEN (
                        SELECT GROUP_CONCAT(u.username ORDER BY u.username SEPARATOR ', ') 
                        FROM users u 
                        JOIN conversation_participants cp ON u.id = cp.user_id 
                        WHERE cp.conversation_id = c.id
                    )
                    ELSE c.conversation_name
                END AS conversation_name,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', u.id,
                        'username', u.username,
                        'email', u.email
                    )
                ) AS participants
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            JOIN users u ON cp.user_id = u.id
            ${userRole !== '1' ? "WHERE c.id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = ?)" : ""}
            GROUP BY c.id, c.type, c.conversation_name, c.created_at
            ORDER BY c.created_at DESC
        `;

        // Adjust query parameters based on role
        const queryParams = userRole === '1' 
            ? [userRole, currentUserId, currentUserId]  // For admin
            : [userRole, currentUserId, currentUserId, currentUserId]; // For normal users

        const [conversations] = await connection.execute(query, queryParams);

        res.status(200).json(conversations);
    } catch (err) {
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
};

export const createMessages = async (req, res) => {
    try {
        const { conversation_id, sender_id, message } = req.body;

        if (!conversation_id || !sender_id || !message) {
            return res.status(400).json({ error: "conversation_id, sender_id, and message are required." });
        }

        // Insert message into database
        const query = `
          INSERT INTO messages (conversation_id, sender_id, message, is_read, created_at) 
          VALUES (?, ?, ?, false, NOW())`;
        const values = [conversation_id, sender_id, message];

        const [result] = await connection.execute(query, values);
        res.status(201).json({ id: result.insertId, conversation_id, sender_id, message });
    } catch (err) {
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
}

export const getMessages = async (req, res) => {
    try {
        const { conversation_id } = req.params;

        // Fetch chat history
        const query = `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`;
        const [messages] = await connection.execute(query, [conversation_id]);

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
}
