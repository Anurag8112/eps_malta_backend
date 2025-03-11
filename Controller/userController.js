import connection from "../index.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { sendMail } from "../Service/SendMail.js";
import bcrypt from "bcrypt";

dotenv.config();

// admin Add POST API
export const userAdd = async (req, res) => {
  try {
    const { username, email, mobile, role, qualifications, skills, languages } =
      req.body;

    // Check if required fields are missing
    if (
      !username ||
      !email ||
      !mobile ||
      !role ||
      !qualifications ||
      !skills ||
      !languages
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if the email or username already exists in the database
    const checkUserQuery =
      "SELECT * FROM users WHERE email = ? OR username = ?";
    const [existingUsers] = await connection.query(checkUserQuery, [
      email,
      username,
    ]);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.email === email) {
        return res.status(409).json({ error: "Email already exists" });
      }
      if (existingUser.username === username) {
        return res.status(409).json({ error: "Username already exists" });
      }
    }

    // Insert the new user into the database with the hashed password
    const insertQuery =
      "INSERT INTO users (username, email ,mobile, role) VALUES (?, ?, ? ,?)";
    await connection.query(insertQuery, [username, email, mobile, role]);

    // Get the ID of the newly inserted user
    const getUserIdQuery = "SELECT LAST_INSERT_ID() as user_id";
    const [userIdResult] = await connection.query(getUserIdQuery);
    const userId = userIdResult[0].user_id;

    // Insert qualifications into user_qualifications table
    for (const qualification of qualifications) {
      const insertQualificationQuery =
        "INSERT INTO user_qualifications (employee_id, qualification_id) VALUES (?, ?)";
      await connection.query(insertQualificationQuery, [
        userId,
        qualification.qualification_id,
      ]);
    }

    // Insert skills into user_skills table
    for (const skill of skills) {
      const insertSkillQuery =
        "INSERT INTO user_skills (employee_id, skill_id) VALUES (?, ?)";
      await connection.query(insertSkillQuery, [userId, skill.skill_id]);
    }

    // Insert languages into user_languages table
    for (const language of languages) {
      const insertLanguageQuery =
        "INSERT INTO user_languages (employee_id, language_id) VALUES (?, ?)";
      await connection.query(insertLanguageQuery, [
        userId,
        language.language_id,
      ]);
    }

    const subject = "Action Required: Complete Your User Registration";
    const text = `To finalize your registration, please click on the link : 
    ${process.env.PASSWORD_URL}/generate-password`;

    // Send an email to the provided email address
    await sendMail(email, subject, text);
    res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const userAddV2 = async (req, res) => {
  try {
    const {
      username,
      email,
      mobile,
      role,
      qualifications,
      skills,
      languages,
      password,
    } = req.body;

    // Check if required fields are missing
    if (
      !username ||
      !email ||
      !mobile ||
      !role ||
      !qualifications ||
      !skills ||
      !languages ||
      !password ||
      password == ""
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if the email or username already exists in the database
    const checkUserQuery =
      "SELECT * FROM users WHERE email = ? OR username = ?";
    const [existingUsers] = await connection.query(checkUserQuery, [
      email,
      username,
    ]);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.email === email) {
        return res.status(409).json({ error: "Email already exists" });
      }
      if (existingUser.username === username) {
        return res.status(409).json({ error: "Username already exists" });
      }
    }

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

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database with the hashed password
    const insertQuery =
      "INSERT INTO users (username, email ,mobile, role, password) VALUES (?, ?, ? ,?, ?)";
    await connection.query(insertQuery, [
      username,
      email,
      mobile,
      role,
      hashedPassword,
    ]);

    // Get the ID of the newly inserted user
    const getUserIdQuery = "SELECT LAST_INSERT_ID() as user_id";
    const [userIdResult] = await connection.query(getUserIdQuery);
    const userId = userIdResult[0].user_id;

    // Insert qualifications into user_qualifications table
    for (const qualification of qualifications) {
      const insertQualificationQuery =
        "INSERT INTO user_qualifications (employee_id, qualification_id) VALUES (?, ?)";
      await connection.query(insertQualificationQuery, [
        userId,
        qualification.qualification_id,
      ]);
    }

    // Insert skills into user_skills table
    for (const skill of skills) {
      const insertSkillQuery =
        "INSERT INTO user_skills (employee_id, skill_id) VALUES (?, ?)";
      await connection.query(insertSkillQuery, [userId, skill.skill_id]);
    }

    // Insert languages into user_languages table
    for (const language of languages) {
      const insertLanguageQuery =
        "INSERT INTO user_languages (employee_id, language_id) VALUES (?, ?)";
      await connection.query(insertLanguageQuery, [
        userId,
        language.language_id,
      ]);
    }

    const subject = "Action Required: Complete Your User Registration";
    const text = `To finalize your registration, please click on the link : 
    ${process.env.PASSWORD_URL}/generate-password`;

    // Send an email to the provided email address
    // await sendMail(email, subject, text);
    res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

// --------------------------------------------------------------------------------------------

// User View GET API
export const userView = async (req, res) => {
  try {
    let query = `
      SELECT 
        u.*, 
        q.id AS qualification_id,
        q.qualifications AS qualification_name,
        s.id AS skill_id,
        s.skills AS skill_name,
        l.id AS language_id,
        l.languages AS language_name
      FROM 
        users u
      LEFT JOIN 
        user_qualifications qu ON u.id = qu.employee_id
      LEFT JOIN 
        qualifications q ON qu.qualification_id = q.id
      LEFT JOIN 
        user_skills sk ON u.id = sk.employee_id
      LEFT JOIN 
        skills s ON sk.skill_id = s.id
      LEFT JOIN 
        user_languages ul ON u.id = ul.employee_id
      LEFT JOIN 
        languages l ON ul.language_id = l.id
      WHERE 1=1`; // Initial WHERE clause to always be true

    const { qualification, skill, language } = req.query;

    if (qualification) {
      const qualificationIds = qualification.split(",");
      query += ` AND q.id IN (${qualificationIds.join(",")})`;
    }

    if (skill) {
      const skillIds = skill.split(",");
      query += ` AND s.id IN (${skillIds.join(",")})`;
    }

    if (language) {
      const languageIds = language.split(",");
      query += ` AND l.id IN (${languageIds.join(",")})`;
    }

    query += `
      ORDER BY 
        u.status DESC, 
        u.username,
        u.id, 
        qualification_id, 
        skill_id, 
        language_id;`;

    const [rows] = await connection.query(query);

    const usersMap = new Map();
    rows.forEach(
      ({
        id,
        qualification_id,
        qualification_name,
        skill_id,
        skill_name,
        language_id,
        language_name,
        ...userData
      }) => {
        const user = usersMap.get(id) || {
          id: id,
          ...userData,
          qualifications: [],
          skills: [],
          languages: [],
        };
        if (
          qualification_id &&
          !user.qualifications.some((q) => q.value === qualification_id)
        ) {
          user.qualifications.push({
            value: qualification_id,
            label: qualification_name,
          });
        }
        if (skill_id && !user.skills.some((s) => s.value === skill_id)) {
          user.skills.push({ value: skill_id, label: skill_name });
        }
        if (
          language_id &&
          !user.languages.some((l) => l.value === language_id)
        ) {
          user.languages.push({
            value: language_id,
            label: language_name,
          });
        }
        usersMap.set(id, user);
      }
    );

    const users = Array.from(usersMap.values());

    // Sort the qualifications, skills, and languages arrays alphabetically by label
    users.forEach((user) => {
      user.qualifications.sort((a, b) => a.label.localeCompare(b.label));
      user.skills.sort((a, b) => a.label.localeCompare(b.label));
      user.languages.sort((a, b) => a.label.localeCompare(b.label));
    });

    res.status(200).json({ users });
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
};

// GET USER PROFILE DATA
export const getUserProfileData = async (req, res) => {
  try {
    const userId = req.user.userId;

    const query =
      "SELECT username, email, mobile, role FROM users WHERE id = ?";
    const [results] = await connection.query(query, [userId]);

    if (results.length > 0) {
      const userData = results[0];

      userData.userId = userId;

      res.status(200).json(userData);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// User Edit PUT API
export const userEdit = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const userQuery = "SELECT * FROM users WHERE id = ?";
    const [existingUser] = await connection.query(userQuery, [id]);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    let updateFields = [];
    let updateValues = [];

    Object.keys(updates).forEach((key) => {
      if (
        key === "username" ||
        key === "email" ||
        key === "mobile" ||
        key === "role" ||
        key === "status"
      ) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Update user data in the users table
    const updateQuery = `UPDATE users SET ${updateFields.join(
      ","
    )} WHERE id = ?`;
    const queryValues = [...updateValues, id];
    await connection.query(updateQuery, queryValues);

    // Update or delete qualifications data in the user_qualification table
    if (updates.qualifications && Array.isArray(updates.qualifications)) {
      const userQualificationsQuery =
        "SELECT * FROM user_qualifications WHERE employee_id = ?";
      const [existingQualifications] = await connection.query(
        userQualificationsQuery,
        [id]
      );

      const receivedQualificationsIds = updates.qualifications.map(
        (qualification) => qualification.qualification_id
      );
      const existingQualificationsIds = existingQualifications.map(
        (qualification) => qualification.qualification_id
      );

      const qualificationsToAdd = updates.qualifications.filter(
        (qualification) =>
          !existingQualificationsIds.includes(qualification.qualification_id)
      );
      const qualificationsToDelete = existingQualifications.filter(
        (qualification) =>
          !receivedQualificationsIds.includes(qualification.qualification_id)
      );

      // Insert new qualifications
      for (const qualification of qualificationsToAdd) {
        await connection.query(
          "INSERT INTO user_qualifications (employee_id, qualification_id) VALUES (?, ?)",
          [id, qualification.qualification_id]
        );
      }

      // Delete qualifications not present in the received array
      for (const qualification of qualificationsToDelete) {
        await connection.query(
          "DELETE FROM user_qualifications WHERE employee_id = ? AND qualification_id = ?",
          [id, qualification.qualification_id]
        );
      }
    }

    // Update or delete skills data in the user_skills table
    if (updates.skills && Array.isArray(updates.skills)) {
      const userSkillsQuery = "SELECT * FROM user_skills WHERE employee_id = ?";
      const [existingSkills] = await connection.query(userSkillsQuery, [id]);

      const receivedSkillsIds = updates.skills.map((skill) => skill.skill_id);
      const existingSkillsIds = existingSkills.map((skill) => skill.skill_id);

      const skillsToAdd = updates.skills.filter(
        (skill) => !existingSkillsIds.includes(skill.skill_id)
      );
      const skillsToDelete = existingSkills.filter(
        (skill) => !receivedSkillsIds.includes(skill.skill_id)
      );

      // Insert new skills
      for (const skill of skillsToAdd) {
        await connection.query(
          "INSERT INTO user_skills (employee_id, skill_id) VALUES (?, ?)",
          [id, skill.skill_id]
        );
      }

      // Delete skills not present in the received array
      for (const skill of skillsToDelete) {
        await connection.query(
          "DELETE FROM user_skills WHERE employee_id = ? AND skill_id = ?",
          [id, skill.skill_id]
        );
      }
    }

    // Update or delete language data in the user_languages table
    if (updates.languages && Array.isArray(updates.languages)) {
      const userLanguagesQuery =
        "SELECT * FROM user_languages WHERE employee_id = ?";
      const [existingLanguages] = await connection.query(userLanguagesQuery, [
        id,
      ]);

      const receivedLanguageIds = updates.languages.map(
        (language) => language.language_id
      );
      const existingLanguageIds = existingLanguages.map(
        (language) => language.language_id
      );

      const languagesToAdd = updates.languages.filter(
        (language) => !existingLanguageIds.includes(language.language_id)
      );
      const languagesToDelete = existingLanguages.filter(
        (language) => !receivedLanguageIds.includes(language.language_id)
      );

      // Insert new languages
      for (const language of languagesToAdd) {
        await connection.query(
          "INSERT INTO user_languages (employee_id, language_id) VALUES (?, ?)",
          [id, language.language_id]
        );
      }

      // Delete languages not present in the received array
      for (const language of languagesToDelete) {
        await connection.query(
          "DELETE FROM user_languages WHERE employee_id = ? AND language_id = ?",
          [id, language.language_id]
        );
      }
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// User Delete API
export const userDelete = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete user from the users table
    const deleteUserQuery = "DELETE FROM users WHERE id = ?";
    await connection.query(deleteUserQuery, [id]);

    // Delete associated records from qualifications, skills, and languages tables
    const deleteQualificationsQuery =
      "DELETE FROM user_qualifications WHERE employee_id = ?";
    const deleteSkillsQuery = "DELETE FROM user_skills WHERE employee_id = ?";
    const deleteLanguagesQuery =
      "DELETE FROM user_languages WHERE employee_id = ?";
    await Promise.all([
      connection.query(deleteQualificationsQuery, [id]),
      connection.query(deleteSkillsQuery, [id]),
      connection.query(deleteLanguagesQuery, [id]),
    ]);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const userSummaryView = async (req, res) => {
  try {
    // Queries for individual tables
    const queries = [
      "SELECT * FROM qualifications",
      "SELECT * FROM skills",
      "SELECT * FROM languages",
    ];

    // Execute queries sequentially
    const results = [];
    for (const query of queries) {
      const [result] = await connection.query(query);
      results.push(result);
    }

    // Extract data from results
    const data = {
      qualifications: results[0],
      skills: results[1],
      languages: results[2],
    };

    // Sort data alphabetically
    data.qualifications.sort((a, b) =>
      a.qualifications.localeCompare(b.qualification_name)
    );
    data.skills.sort((a, b) => a.skills.localeCompare(b.skill_name));
    data.languages.sort((a, b) => a.languages.localeCompare(b.language_name));

    // Return response
    return res.status(200).json({ data });
  } catch (error) {
    console.error("Error retrieving data from three tables:", error);
    return res.status(500).json({
      error: "Failed to retrieve the data of Qualification, Skills, Languages.",
    });
  }
};
