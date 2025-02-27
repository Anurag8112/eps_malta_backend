import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

console.log("DB Config:", dbConfig);

export const connectToDatabase = async () => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL database!");
    return connection;
  } catch (error) {
    console.error("Error connecting to MySQL database:", error);
    throw error;
  }
};

export default connectToDatabase;
