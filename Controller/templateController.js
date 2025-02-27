import connection from "../index.js";

// POST || API
export const templateAdd = async (req, res) => {
  try {
    const { title, timesheetName, type } = req.body;

    const query =
      "INSERT INTO template (title, timesheetName, type) VALUES (?, ?, ?)";
    const values = [title, timesheetName, type];

    await connection.query(query, values);
    res.status(201).json({ message: "template created successfully" });
  } catch (error) {
    console.error("Error while create template:", error);
    res.status(500).json({ error: "Failed to Create Template" });
  }
};

// PUT || API
export const templateEdit = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, timesheetName, type } = req.body;

    const checkQuery = "SELECT * FROM template WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "template not found" });
    }

    const updateQuery =
      "UPDATE template SET title = ?, timesheetName = ?, type = ? WHERE id = ?";
    await connection.query(updateQuery, [title, timesheetName, type, id]);

    res.status(200).json({ message: "template updated successfully" });
  } catch (error) {
    console.error("Error while updating template:", error);
    res.status(500).json({ error: "Failed to update template" });
  }
};

// GET || API
export const templateView = async (req, res) => {
  try {
    const query = "SELECT * FROM template ORDER BY title";
    const [result] = await connection.query(query);

    // Transform the result array to the desired response format
    const response = result.map((row) => ({
      id: row.id,
      title: row.title,
      timesheetName: row.timesheetName,
      type: row.type,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error retrieving in template data:", error);
    res.status(500).json({ error: "Failed to retrieve template data" });
  }
};

// DELETE || API
export const templateDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = "SELECT * FROM template WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    const deleteQuery = "DELETE FROM template WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error while deleting template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
};

// export const generatePdf = (req, res) => {
//   const tableData = [
//     ["Name", "Age", "Occupation"],
//     ["John Doe", "30", "Engineer"],
//     ["Jane Smith", "28", "Designer"],
//     ["Bob Johnson", "35", "Developer"],
//   ];

//   // Create a new PDF document
//   const doc = new PDFDocument();

//   // Set font size
//   doc.fontSize(12);

//   // Calculate table properties
//   const cellWidth = 120;
//   const cellHeight = 30;
//   const tableTop = 100;
//   const tableLeft = (doc.page.width - cellWidth * tableData[0].length) / 2;

//   // Function to draw a cell with content and border
//   const drawCell = (content, x, y) => {
//     doc.rect(x, y, cellWidth, cellHeight).stroke();
//     doc.text(content, x + 5, y + 5, { width: cellWidth - 10, align: "center" });
//   };

//   // Draw table headers
//   doc.font("Helvetica-Bold");
//   tableData[0].forEach((header, columnIndex) => {
//     drawCell(header, tableLeft + cellWidth * columnIndex, tableTop);
//   });

//   // Draw table data
//   doc.font("Helvetica");
//   for (let rowIndex = 1; rowIndex < tableData.length; rowIndex++) {
//     const rowData = tableData[rowIndex];
//     rowData.forEach((cell, columnIndex) => {
//       drawCell(
//         cell,
//         tableLeft + cellWidth * columnIndex,
//         tableTop + cellHeight * rowIndex
//       );
//     });
//   }

//   // Finalize the PDF document
//   doc.end();

//   // Save the PDF to a file on the server
//   const pdfFilePath = "example.pdf";
//   const writeStream = fs.createWriteStream(pdfFilePath);
//   doc.pipe(writeStream);

//   writeStream.on("finish", () => {
//     console.log("PDF saved successfully.");
//     res.status(200).json({ message: "PDF generated and saved successfully." });
//   });

//   writeStream.on("error", (error) => {
//     console.error("Error saving PDF:", error);
//     res.status(500).json({ message: "Error saving PDF" });
//   });
// };
