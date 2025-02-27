import connection from "../index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import { sendMail } from "../Service/SendMail.js";

dotenv.config();

// Admin Add POST API
export const adminAdd = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check if the username already exists in the database
    const usernameCheckQuery = "SELECT * FROM users WHERE username = ?";
    const [existingUsers] = await connection.query(usernameCheckQuery, [
      username,
    ]);

    if (existingUsers.length > 0) {
      // username already exists, return an error
      return res.status(409).json({ error: "username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database with the hashed password
    const insertQuery =
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
    const [result] = await connection.query(insertQuery, [
      username,
      hashedPassword,
      role,
    ]);

    const userId = result.insertId;

    res.status(201).json({ message: "admin created successfully", userId });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

// Admin Login POST API
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the username exists in the database
    const usernameCheckQuery = "SELECT * FROM users WHERE email = ?";
    const [existingUsers] = await connection.query(usernameCheckQuery, [email]);

    if (existingUsers.length === 0) {
      // username does not exist, return an error
      return res.status(404).json({ error: "email not found" });
    }

    const user = existingUsers[0];

    if (user.status === "0") {
      return res.status(403).json({ error: "Employee account is deactivated" });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Password is incorrect, return an error
      return res.status(401).json({ error: "Invalid password" });
    }

    // Password is correct, generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        status: user.status,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "24h",
      }
    );

    // Login successful, return token and user ID
    res
      .status(200)
      .json({ message: "Login successful", token, userId: user.id });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Failed to login" });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId; // Extract the user ID from the JWT token

    // Retrieve the user's current password from the database
    const getPasswordQuery = "SELECT password FROM users WHERE id = ?";
    const [results] = await connection.query(getPasswordQuery, [userId]);

    if (results.length === 0) {
      // User not found, return an error
      return res.status(404).json({ error: "User not found" });
    }

    const { password: storedPassword } = results[0];

    // Compare the provided current password with the stored password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      storedPassword
    );

    if (!isPasswordValid) {
      // Current password is incorrect, return an error
      return res.status(401).json({ error: "Invalid current password" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    const updatePasswordQuery = "UPDATE users SET password = ? WHERE id = ?";
    await connection.query(updatePasswordQuery, [hashedPassword, userId]);

    // Password updated successfully
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error during password change:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
};

export const generatePassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Password validation
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password should be at least 8 characters long" });
    }

    const regex = /^(?=.*[!@#$%^&*])/.test(password)
      ? /^(?=.*[A-Z])/.test(password)
        ? /.{8,}/.test(password)
          ? null
          : "Password should be at least 8 characters long"
        : "Password should contain at least one capital letter"
      : "Password should contain at least one special character";

    if (regex) {
      return res.status(400).json({
        error: regex,
      });
    }

    // Check if email already exists
    const checkQuery = "SELECT * FROM users WHERE email = ?";
    const [rows] = await connection.query(checkQuery, [email]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Email does not exist" });
    }

    // Check if password is already generated
    if (rows[0].password !== null) {
      return res.status(400).json({
        error:
          "Password has already been generated. Please reset your password if needed.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the name and hashed password to the user table based on the email
    const updateQuery = "UPDATE users SET password = ? WHERE email = ?";
    await connection.query(updateQuery, [hashedPassword, email]);

    // Return success response
    res.json({ message: "Your password has been generated successfully" });
  } catch (error) {
    // Handle errors and rollback transaction if necessary
    console.error("Error in generatePassword:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email already exists in the database
    const emailCheckQuery = "SELECT * FROM users WHERE email = ?";
    const [existingUsers] = await connection.query(emailCheckQuery, [email]);

    if (existingUsers.length === 0) {
      // Email does not exist, return an error
      return res.status(404).json({ error: "Email not found" });
    }

    // Generate a random OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      alphabets: false,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    const subject = "Password Reset Instructions";
    const text = `Your OTP for password reset is: ${otp}`;

    await sendMail(email, subject, text);

    // Update the user's OTP in the database
    const updateOtpQuery = "UPDATE users SET otp = ? WHERE email = ?";
    await connection.query(updateOtpQuery, [otp, email]);

    // Return success response
    res.json({
      message: "OTP sent successfully to the email you have entered.",
    });
  } catch (error) {
    console.log("Error sending email:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Otp verify
export const otpValidate = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Check if OTP is 6 digits long
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "Invalid OTP format" });
    }

    // Check if the email and OTP match in the database
    const verifyUserQuery = "SELECT * FROM users WHERE email = ? AND otp = ?";
    const [matchedUsers] = await connection.query(verifyUserQuery, [
      email,
      otp,
    ]);

    if (matchedUsers.length === 0) {
      return res.status(400).json({ error: "Invalid OTP" });
    } else {
      return res.status(200).json({ message: "OTP validation successful" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "An error occurred" });
  }
};

// Update password
export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Password validation
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password should be at least 8 characters long" });
    }

    const regex = /^(?=.*[!@#$%^&*])/.test(password)
      ? /^(?=.*[A-Z])/.test(password)
        ? /.{8,}/.test(password)
          ? null
          : "Password should be at least 8 characters long"
        : "Password should contain at least one capital letter"
      : "Password should contain at least one special character";

    if (regex) {
      return res.status(400).json({
        error: regex,
      });
    }

    // Check if the email and OTP match in the database
    const verifyUserQuery = "SELECT * FROM users WHERE email = ?";
    const [matchedUsers] = await connection.query(verifyUserQuery, [email]);

    if (matchedUsers.length === 0) {
      return res.status(400).json({ error: "Invalid Email" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's hashed password and clear the OTP in the database
    const updatePasswordQuery =
      "UPDATE users SET password = ?, otp = NULL WHERE email = ?";
    const updateResult = await connection.query(updatePasswordQuery, [
      hashedPassword,
      email,
    ]);

    if (updateResult) {
      return res.json({ message: "Password reset successfully" });
    } else {
      return res.status(500).json({ error: "Failed to reset password" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "An error occurred" });
  }
};
