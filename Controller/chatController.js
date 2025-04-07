import { query } from "express";
import connection from "../index.js";
import moment from "moment-timezone";
import { sendPushNotification } from "../Service/notificationService.js";
import { NOTIFICATION_MESSAGE } from "../constants/app.contsants.js";
import { getAttachmentUrlById } from "./uploadController.js"

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

        const otherParticipant = participants.find(id => id !== currentUserId);

        // Private conversation validation
        if (type === "private") {
            if (participants.length !== 2) {
                return res.status(400).json({ error: "Private conversations must have exactly 2 participants." });
            }
            if (!participants.includes(currentUserId)) {
                return res.status(400).json({ error: "Authenticated user must be one of the participants in a private conversation." });
            }

            const query = `
                SELECT cnv.id as conversation_id, cnv.type, cnv.created_at, u.username AS conversation_name 
                FROM conversations AS cnv
                JOIN conversation_participants AS cp1 ON cnv.id = cp1.conversation_id
                JOIN conversation_participants AS cp2 ON cnv.id = cp2.conversation_id
                JOIN users AS u ON u.id = cp2.user_id
                WHERE cnv.type = 'private' 
                AND cp1.user_id = ? 
                AND cp2.user_id = ? 
                AND cp2.user_id != ?;
            `;
            const [rows] = await connection.execute(query, [currentUserId, otherParticipant, currentUserId]);

            if(rows.length > 0){
                return res.status(400).json({ error: "Conversation already exists." });
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

        if(type == "private"){
            const conversationNameQuery = "Select username from users where id = ?";
            const [result] = await connection.query(conversationNameQuery, [otherParticipant]);
            console.log('result',result);
            if(!finalConversationName){
                finalConversationName = result[0].username;
            }
        }

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
        const userTimezoneOffset = req.headers["x-timezone-offset"] || 0; // Get timezone offset from request

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
                    WHEN c.type = 'private' THEN (
                        SELECT u.username 
                        FROM users u 
                        JOIN conversation_participants cp ON u.id = cp.user_id 
                        WHERE cp.conversation_id = c.id AND u.id != ?
                        LIMIT 1
                    )
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
                ) AS participants,
                (
                    SELECT m.message 
                    FROM messages m 
                    WHERE m.conversation_id = c.id 
                    ORDER BY m.created_at DESC 
                    LIMIT 1
                ) AS last_message,
                (
                    SELECT m.created_at 
                    FROM messages m 
                    WHERE m.conversation_id = c.id 
                    ORDER BY m.created_at DESC 
                    LIMIT 1
                ) AS last_message_time
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            JOIN users u ON cp.user_id = u.id
            ${userRole !== '1' ? "WHERE c.id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = ?)" : ""}
            GROUP BY c.id, c.type, c.conversation_name, c.created_at
            ORDER BY c.created_at DESC
        `;

        const queryParams = userRole === '1'
            ? [userRole, currentUserId, currentUserId]  // For admin
            : [userRole, currentUserId, currentUserId, currentUserId]; // For normal users

        const [conversations] = await connection.execute(query, queryParams);

        // Format last message time with time offset
        const formattedConversations = conversations.map(conversation => {
            if (conversation.last_message_time) {
                const serverTime = moment.utc(conversation.last_message_time); // Convert to UTC
                const localTime = serverTime.utcOffset(userTimezoneOffset); // Adjust based on user's timezone
                conversation.last_message_time = localTime.fromNow(); // Convert to "2 min ago" format
            } else {
                conversation.last_message_time = null;
            }
            return conversation;
        });

        res.status(200).json(formattedConversations);
    } catch (err) {
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
};



export const getOneToOneConversations = async (req, res) => {
    const { receiverId } = req.query;
    const loggedInUserId = req.user.userId;

    const query = `
        SELECT cnv.id AS conversation_id, cnv.type, cnv.created_at, u.username AS conversation_name 
        FROM conversations AS cnv
        JOIN conversation_participants AS cp1 ON cnv.id = cp1.conversation_id
        JOIN conversation_participants AS cp2 ON cnv.id = cp2.conversation_id
        JOIN users AS u ON u.id = cp2.user_id
        WHERE cnv.type = 'private' 
        AND cp1.user_id = ? 
        AND cp2.user_id = ? 
        AND cp2.user_id != ?;
    `;

    try {
        const [rows] = await connection.execute(query, [loggedInUserId, receiverId, loggedInUserId]);
        const conversation = rows.length ? rows[0] : null;
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createMessages = async (req, res) => {
    try {
        const { conversation_id, sender_id, message , attachment_id} = req.body;

        if (!conversation_id || !sender_id || !message) {
            return res.status(400).json({ error: "conversation_id, sender_id, and message are required." });
        }

        await connection.beginTransaction();

        // Insert message into database
        const insertQuery = `
          INSERT INTO messages (conversation_id, sender_id, message,attachment_id, is_read, created_at) 
          VALUES (?, ?, ?,?, false, NOW())`;
        const values = [conversation_id, sender_id, message,attachment_id];

        const [result] = await connection.execute(insertQuery, values);

        // Fetch participants and their FCM tokens concurrently
        const participantsQuery = `
          SELECT DISTINCT user_id FROM conversation_participants 
          WHERE conversation_id = ? AND user_id != ?`;
        const [participants] = await connection.execute(participantsQuery, [conversation_id, sender_id]);

        if (participants.length > 0) {
            const userIds = participants.map(p => p.user_id);

            const fcmQuery = `SELECT fcm_token FROM push_notification WHERE user_id IN (${userIds.map(() => '?').join(',')})`;
            const [fcmTokens] = await connection.execute(fcmQuery, userIds);

            fcmTokens.forEach(({ fcm_token }) => {
                sendPushNotification(fcm_token, NOTIFICATION_MESSAGE.NEW_MESSAGE_RECIEVED.subject, NOTIFICATION_MESSAGE.NEW_MESSAGE_RECIEVED.body);
            });
        }

        await connection.commit();

        const fetchQuery= "Select * from messages where id = ?";

        const [fetchResult] = await connection.query(fetchQuery, [result.insertId]);

        res.status(201).json(fetchResult[0]);
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { conversation_id } = req.params;

        // Fetch chat history
        const query = `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`;
        const [messages] = await connection.execute(query, [conversation_id]);

        // Add fileUrl if attachment_id exists
        const updatedMessages = await Promise.all(
            messages.map(async (message) => {
                if (message.attachment_id) {
                    try {
                        const fileUrl = await getAttachmentUrlById(message.attachment_id);
                        return { ...message, fileUrl };
                    } catch (err) {
                        // If file not found, just skip the URL
                        return { ...message, fileUrl: null };
                    }
                } else {
                    return { ...message, fileUrl: null };
                }
            })
        );

        res.json(updatedMessages);
    } catch (err) {
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
};

