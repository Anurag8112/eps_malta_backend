import jwt, { decode } from "jsonwebtoken";
import dotenv from "dotenv";
import connection from "../index.js";

dotenv.config();

export const authenticateJWT = async (req, res, next) => {
  // Get the JWT token from the request headers
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    // Token not provided, return an error
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Verify the JWT token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (decoded.role === "2" || decoded.role === "3") {
      const query = "SELECT status FROM users WHERE id = ?";
      const [results] = await connection.execute(query, [decoded.userId]);

      if (results.length === 0 || results[0].status === "0") {
        return res.status(403).send("Account Deactivated");
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    // Token is invalid or secret key is incorrect
    return res.status(403).json({ error: "Forbidden" });
  }
};
