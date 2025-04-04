import connection from "../index.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Target directory
const ATTACHMENT_DIR = path.resolve("uploads/attachments");

// Ensure upload directory exists
if (!fs.existsSync(ATTACHMENT_DIR)) {
    fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });
}

// Use multer with memory storage
const upload = multer({ storage: multer.memoryStorage() });

export const uploadAttachment = async (req, res) => {
    upload.single("file")(req, res, async (err) => {
        if (err) {
            return res.status(500).json({ message: "File upload failed", error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const originalName = req.file.originalname;
        const fileExt = path.extname(originalName); // Detect extension

        try {
            // Step 1: Insert dummy record to get auto-incremented ID
            const [result] = await connection.execute(
                "INSERT INTO attachments (file_name, file_path) VALUES (?, ?)",
                ["", ""]
            );

            const insertedId = result.insertId;
            const newFilename = `${insertedId}${fileExt}`;
            const newFilePath = path.join(ATTACHMENT_DIR, newFilename);

            // Step 2: Save the file to disk
            fs.writeFileSync(newFilePath, req.file.buffer);

            // Step 3: Update the DB with actual values
            await connection.execute(
                "UPDATE attachments SET file_name = ?, file_path = ? WHERE id = ?",
                [newFilename, newFilePath, insertedId]
            );

            res.status(201).json({ message: "File uploaded successfully", id: insertedId, filename: newFilename });
        } catch (dbError) {
            res.status(500).json({ message: "Database error", error: dbError.message });
        }
    });
};

export const getAttachmentUrlById = async (id) => {
    const [rows] = await connection.execute(
        "SELECT file_name FROM attachments WHERE id = ?",
        [id]
    );

    if (rows.length === 0) {
        throw new Error("File not found");
    }

    const fileName = rows[0].file_name;
    const baseUrl = "http://174.138.57.202:8000";
    const fileUrl = `${baseUrl}/upload/attachments/${fileName}`;
    return fileUrl;
};

