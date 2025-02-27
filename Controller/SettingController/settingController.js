import connection from "../../index.js";

// GET || API
export const settingView = async (req, res) => {
  try {
    const query = "SELECT * FROM app_setting";
    const [result] = await connection.query(query);
    res.status(200).json({ result });
  } catch (error) {
    console.error("Error retrieving client:", error);
    res.status(500).json({ error: "Failed to retrieve client" });
  }
};

// POST || API
// export const settingAdd = async (req, res) => {
//   try {
//     const { colors, rate_cap, pdf_footer_info, app_title } = req.body;

//     // Check if the files exist in the request
//     const company_logo = req.files["company_logo"][0].path || null;
//     const pdf_header_logo = req.files["pdf_header_logo"][0].path || null;

//     const insertQuery =
//       "INSERT INTO app_setting (company_logo, colors, rate_cap,pdf_header_logo, pdf_footer_info, app_title) VALUES (?,?, ?, ?, ?, ?)";
//     const values = [
//       company_logo,
//       colors,
//       rate_cap,
//       pdf_header_logo,
//       pdf_footer_info,
//       app_title,
//     ];

//     await connection.query(insertQuery, values);
//     res.status(201).json({ message: "Setting created successfully" });
//   } catch (error) {
//     console.error("Error while adding setting:", error);
//     res.status(500).json({ error: "Failed to add setting" });
//   }
// };

// PUT || API
export const settingUpdate = async (req, res) => {
  try {
    const { colors, rate_cap, pdf_footer_info, app_title, access_token } =
      req.body;
    const company_logo = req.files["company_logo"]
      ? req.files["company_logo"][0].path
      : null;
    const pdf_header_logo = req.files["pdf_header_logo"]
      ? req.files["pdf_header_logo"][0].path
      : null;
    const settingId = req.params.id;

    const updateFields = [];
    const values = [];

    if (company_logo !== null) {
      updateFields.push("company_logo=?");
      values.push(company_logo);
    }
    if (colors !== undefined) {
      updateFields.push("colors=?");
      values.push(colors);
    }
    if (rate_cap !== undefined) {
      updateFields.push("rate_cap=?");
      values.push(rate_cap);
    }
    if (pdf_header_logo !== null) {
      updateFields.push("pdf_header_logo=?");
      values.push(pdf_header_logo);
    }
    if (pdf_footer_info !== undefined) {
      updateFields.push("pdf_footer_info=?");
      values.push(pdf_footer_info);
    }
    if (app_title !== undefined) {
      updateFields.push("app_title=?");
      values.push(app_title);
    }
    if (access_token !== undefined) {
      updateFields.push("access_token=?");
      values.push(access_token);
    }

    if (updateFields.length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update" });
    }

    const updateQuery = `UPDATE app_setting SET ${updateFields.join(
      ", "
    )} WHERE id=?`;
    values.push(settingId);

    await connection.query(updateQuery, values);
    res.status(200).json({ message: "Setting updated successfully" });
  } catch (error) {
    console.error("Error while updating setting:", error);
    res.status(500).json({ error: "Failed to update setting" });
  }
};
