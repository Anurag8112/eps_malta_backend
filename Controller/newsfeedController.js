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

export const getNewsFeed = async (req, res) => {
    try {
        const query = `
            SELECT 
                feed.*,
                usr.username,
                COUNT(fc.id) AS total_comments,
                COUNT(fl.id) AS total_likes
            FROM feeds AS feed
            JOIN users as usr on usr.id = feed.user_id
            LEFT JOIN feed_comment AS fc ON feed.id = fc.feed_id
            LEFT JOIN feed_likes AS fl ON feed.id = fl.feed_id
            GROUP BY feed.id
            ORDER BY feed.created_at DESC;
        `;
        
        const [rows] = await connection.execute(query);

        return res.status(200).json({ feeds: rows });
    } catch (error) {
        console.error('Error fetching news feed:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


export const getFeedComments = async (req, res) => {
    try {
        const { feedId } = req.params;

        if (!feedId) {
            return res.status(400).json({ message: 'Feed ID is required' });
        }

        const query = "SELECT * FROM feed_comment WHERE feed_id = ? ORDER BY created_at DESC;";
        const [rows] = await connection.execute(query, [feedId]);

        return res.status(200).json({ comments: rows });
    } catch (error) {
        console.error('Error fetching feed comments:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

