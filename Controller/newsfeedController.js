import { body, validationResult } from 'express-validator';
import connection from "../index.js";

export const validateRequests = {
    postNewsFeed: [
        body('content')
            .trim()
            .notEmpty().withMessage('Content is required')
            .isLength({ min: 5, max: 500 }).withMessage('Content must be between 5 and 500 characters'),
    ],
    postFeedComment: [
        body('comment')
            .trim()
            .notEmpty().withMessage('Comment is required')
            .isLength({ min: 1, max: 300 }).withMessage('Comment must be between 1 and 300 characters'),
        body('feedId')
            .notEmpty().withMessage('Feed ID is required')
            .isInt().withMessage('Feed ID must be an integer'),
    ]
};

export const postNewsFeed = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { userId } = req.user;
        const { content } = req.body;

        const query = "INSERT INTO feeds (user_id, content, created_at) VALUES (?, ?, ?);";
        const [result] = await connection.execute(query, [userId, content, new Date()]);

        return res.status(201).json({ message: 'Post created successfully', postId: result.insertId });
    } catch (error) {
        console.error('Error posting news feed:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const likeNewsFeed = async (req, res) => {
    try {
        const { userId } = req.user;
        const { feedId } = req.params;

        // Check if the like already exists
        const getQuery = "SELECT * FROM feed_likes WHERE user_id = ? AND feed_id = ?;";
        const [likeResult] = await connection.execute(getQuery, [userId, feedId]);

        if (likeResult.length > 0) {
            // Unlike (delete) the record
            const deleteQuery = "DELETE FROM feed_likes WHERE user_id = ? AND feed_id = ?;";
            await connection.execute(deleteQuery, [userId, feedId]);

            return res.status(200).json({ message: "Feed unliked successfully" });
        } else {
            // Like (insert) the record
            const insertQuery = "INSERT INTO feed_likes (user_id, feed_id, created_at) VALUES (?, ?, ?);";
            await connection.execute(insertQuery, [userId, feedId, new Date()]);

            return res.status(200).json({ message: "Feed liked successfully" });
        }
        
    } catch (error) {
        console.error("Error processing like/unlike:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


export const postFeedComment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { userId } = req.user;
        const { comment, feedId } = req.body;

        const query = "INSERT INTO feed_comment (feed_id, user_id, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?);";
        const [result] = await connection.execute(query, [feedId, userId, comment, new Date(), new Date()]);

        return res.status(201).json({ message: 'Feed comment created successfully', commentId: result.insertId });
    } catch (error) {
        console.error('Error posting feed comment:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

//

export const getNewsFeed = async (req, res) => {
    try {
        const { userId } = req.user; // Get current user ID

        const query = `
            SELECT 
                feed.id,
                feed.content,
                feed.created_at,
                usr.username,
                COUNT(DISTINCT fc.id) AS total_comments,
                COUNT(DISTINCT fl.id) AS total_likes,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 
                        FROM feed_likes fl_sub 
                        WHERE fl_sub.feed_id = feed.id 
                        AND fl_sub.user_id = ?
                    ) THEN true 
                    ELSE false 
                END AS is_liked
            FROM feeds AS feed
            JOIN users AS usr ON usr.id = feed.user_id
            LEFT JOIN feed_comment AS fc ON feed.id = fc.feed_id
            LEFT JOIN feed_likes AS fl ON feed.id = fl.feed_id
            GROUP BY feed.id, usr.username, feed.content, feed.created_at
            ORDER BY feed.created_at DESC;
        `;

        const [rows] = await connection.execute(query, [userId]);

        return res.status(200).json({ feeds: rows });
    } catch (error) {
        console.error("Error fetching news feed:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


// export const getFeedComments = async (req, res) => {
//     try {
//         const { feedId } = req.params;

//         if (!feedId) {
//             return res.status(400).json({ message: 'Feed ID is required' });
//         }

//         const query = "SELECT * FROM feed_comment WHERE feed_id = ? ORDER BY created_at DESC;";
//         const [rows] = await connection.execute(query, [feedId]);

//         return res.status(200).json({ comments: rows });
//     } catch (error) {
//         console.error('Error fetching feed comments:', error);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// };/


export const getFeedComments = async (req, res) => {
    try {
        const { feedId } = req.params;
        const { userId } = req.user;

        if (!feedId) {
            return res.status(400).json({ message: 'Feed ID is required' });
        }

        // Query to fetch feed details along with total likes and is_liked state
        const feedQuery = `
            SELECT 
                feed.id,
                feed.content,
                feed.created_at,
                usr.username,
                COUNT(DISTINCT fc.id) AS total_comments,
                COUNT(DISTINCT fl.id) AS total_likes,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 
                        FROM feed_likes fl_sub 
                        WHERE fl_sub.feed_id = feed.id 
                        AND fl_sub.user_id = ?
                    ) THEN 1 ELSE 0 
                END AS is_liked
            FROM feeds AS feed
            JOIN users AS usr ON usr.id = feed.user_id
            LEFT JOIN feed_comment AS fc ON feed.id = fc.feed_id
            LEFT JOIN feed_likes AS fl ON feed.id = fl.feed_id
            WHERE feed.id = ?
            GROUP BY feed.id, usr.username, feed.content, feed.created_at;
        `;

        const [feedRows] = await connection.execute(feedQuery, [userId, feedId]);

        if (feedRows.length === 0) {
            return res.status(404).json({ message: 'Feed not found' });
        }

        // Query to fetch comments related to the feed
        const commentsQuery = `SELECT * FROM feed_comment WHERE feed_id = ? ORDER BY created_at DESC;`;
        const [commentsRows] = await connection.execute(commentsQuery, [feedId]);

        const feedData = {
            ...feedRows[0], // Feed details
            comments: commentsRows // List of comments
        };

        return res.status(200).json(feedData);
    } catch (error) {
        console.error('Error fetching feed with comments:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


