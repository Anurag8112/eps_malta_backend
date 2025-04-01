import express from "express";
import { authenticateJWT } from "../Middleware/authenticateJWT.js";
import { getFeedComments, getNewsFeed, likeNewsFeed, postFeedComment, postNewsFeed } from "../Controller/newsfeedController.js";

const router = express.Router();

router.post("/post", authenticateJWT, postNewsFeed);
router.post("/post/comment", authenticateJWT, postFeedComment);
router.post("/post/like/:feedId", authenticateJWT, likeNewsFeed);

router.get("/post", authenticateJWT, getNewsFeed);
router.get("/post/comment/:feedId", authenticateJWT, getFeedComments);

export default router;
