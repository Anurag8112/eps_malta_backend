import connection from "../index.js";

export const createConversations = async (req, res) => {
    try {
        const { type, participants } = req.body;

        if (!type || !Array.isArray(participants) || participants.length < 2) {
            return res.status(400).json({ error: "Invalid request data. Participants should be an array with at least 2 users." });
        }

        // Insert into conversations table
        const [conversationResult] = await connection.execute(
            "INSERT INTO conversations (`type`, created_at) VALUES (?, CURRENT_TIMESTAMP)",
            [type]
        );

        const conversationId = conversationResult.insertId;

        // Insert into conversation_participants table
        const participantValues = participants.map(userId => [conversationId, userId]);
        await connection.query(
            "INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?",
            [participantValues]
        );

        res.status(201).json({ conversationId, type, participants });
    } catch (err) {
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
};


export const getConversations = async (req, res) => {
    try {
        const [conversations] = await connection.execute(`
            SELECT 
              c.id AS conversation_id, 
              c.type, 
              c.created_at, 
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
            GROUP BY c.id
            ORDER BY c.created_at DESC
          `);

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
