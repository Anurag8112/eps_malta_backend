import connection from "../index.js";

export const createAnnouncement = async (req, res) => {
    try {
        const {userId} = req.user;
        const { title, content, announcementUsers } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }
        if (!title || !content) {
            return res.status(400).json({ message: "Title and content are required." });
        }
        if (!Array.isArray(announcementUsers) || announcementUsers.length === 0) {
            return res.status(400).json({ message: "At least one announced user is required." });
        }

        const announcementQuery = `INSERT INTO announcements (title, content, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`;
        const [announcementResult] = await connection.execute(announcementQuery, [title, content, userId, new Date(), new Date()]);

        const announcementId = announcementResult.insertId;
        if (!announcementId) {
            return res.status(500).json({ message: "Failed to create announcement." });
        }

        const mappingQuery = `INSERT INTO announcement_users_mapping (user_id, announcement_id) VALUES ?;`;
        const mappingValues = announcementUsers.map(user => [user, announcementId]);

        await connection.query(mappingQuery, [mappingValues]);

        return res.status(201).json({ message: "Announcement created successfully." });
    } catch (error) {
        console.error("Error creating announcement:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const getAnnouncements = async (req, res) => {
    try {
        const {userId} = req.user;
        
        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }
        
        const query = `
            SELECT a.id, a.title, a.content, a.owner_id, a.created_at, a.updated_at 
            FROM announcements a
            INNER JOIN announcement_users_mapping m ON a.id = m.announcement_id
            WHERE m.user_id = ?
            ORDER BY a.created_at DESC;
        `;
        
        const [results] = await connection.execute(query, [userId]);
        
        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching announcements:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};