import connection from "../../index.js";

// GET || API
export const getFormsDetails = async (req, res) => {
  try {
    const query = "SELECT DISTINCT id, formName, type FROM forms ORDER BY formName";
    const [result] = await connection.query(query);

    const forms = await Promise.all(
      result.map(async (form) => {
        const id = form.id;
        const formName = form.formName;
        const type = form.type;
        const formFieldsQuery = `SELECT * FROM forms WHERE id = ${id}`;
        const [fieldsResult] = await connection.query(formFieldsQuery);

        const fields = fieldsResult.map((field) => ({
          id: field.id,
          field: field.field,
          caption: field.caption,
          dd_values: field.dd_values,
          fieldType: field.fieldType,
        }));

        return {
          formName: formName,
          type: type,
          fields: fields,
        };
      })
    );

    const mergedForms = mergeForms(forms);

    res.status(200).send(mergedForms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve forms data" });
  }
};

// Helper function to merge forms with the same formName
function mergeForms(forms) {
  const mergedForms = [];
  const formMap = new Map();

  forms.forEach((form) => {
    const { formName, fields } = form;
    if (formMap.has(formName)) {
      const existingForm = formMap.get(formName);
      existingForm.fields.push(...fields);
    } else {
      formMap.set(formName, form);
    }
  });

  formMap.forEach((form) => {
    mergedForms.push(form);
  });

  return mergedForms;
}

// POST || API
export const addFormsDetails = async (req, res) => {
  try {
    const { formName, fields } = req.body;

    // Assuming you have validation and error handling logic here

    const insertFormQuery = `INSERT INTO forms (formName, field, caption, dd_values, type, fieldType) VALUES ?`;
    const values = fields.map((field) => [
      formName,
      field.field,
      field.caption,
      field.dd_values,
      getTypeFromFormName(formName),
      field.fieldType || "text", // Set default value as 'text' if fieldType is not provided
    ]);

    await connection.query(insertFormQuery, [values]);

    res.status(200).json({ message: "Forms data added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add forms data" });
  }
};

function getTypeFromFormName(formName) {
  return formName.toLowerCase().replace(/\s+/g, "_");
}

// PUT || API
export const editFormsDetails = async (req, res) => {
  try {
    const { formName, fields } = req.body;

    const updateFormQuery =
      "UPDATE forms SET formName = ?, field = ?, caption = ?, dd_values = ?, fieldType = ? WHERE id = ?";

    for (const field of fields) {
      const {
        id,
        field: fieldVal,
        caption,
        dd_values,
        fieldType,
      } = field;
      const values = [
        formName,
        fieldVal,
        caption,
        dd_values,
        fieldType,
        id,
      ];
      await connection.query(updateFormQuery, values);
    }

    res.status(200).json({ message: "Form data updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update form data" });
  }
};

// DELETE || API
export const deleteFormsDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const checkQuery = "SELECT * FROM forms WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      return res.status(404).json({ message: "This form data is not found" });
    }
    const deleteQuery = "DELETE FROM forms WHERE id = ?";
    await connection.query(deleteQuery, [id]);
    res.status(200).json({ message: "Forms data deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to Delete forms data" });
  }
};
