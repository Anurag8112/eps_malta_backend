import connection from "../index.js";

// Add tasks
export const tasksAdd = async (req, res) => {
  try {
    const { tasks, description } = req.body;

    const checkQuery = "SELECT * FROM tasks WHERE tasks = ?";
    const [existingTasks] = await connection.query(checkQuery, [tasks]);

    if (existingTasks.length > 0) {
      return res.status(400).json({ error: "Tasks already exist" });
    }

    const insertQuery = "INSERT INTO tasks (tasks, description) VALUES (?, ?)";
    const values = [tasks, description];

    const [results] = await connection.query(insertQuery, values);

    const newTasks = { id: results.insertId, tasks, description };
    res.status(201).json({ message: "Tasks created successfully", newTasks });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error adding tasks:", error);
    res.status(500).json({ error: "Failed to add tasks" });
  }
};


// Get taskss
export const tasksView = async (req, res) => {
  try {
    // Retrieve all taskss from the database
    const query = "SELECT * FROM tasks ORDER BY tasks";
    const [results] = await connection.query(query);

    // Return the taskss as the response
    res.status(200).json(results);
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error retrieving taskss:", error);
    res.status(500).json({ error: "Failed to retrieve taskss" });
  }
};


// Update tasks
export const tasksUpdate = async (req, res) => {
  try {
    const { id } = req.params; // Extract the tasks ID from the request parameters
    const { tasks, description } = req.body; // Extract the updated tasks and description from the request body

    // Check if the tasks exists in the database
    const checkQuery = "SELECT * FROM tasks WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      // If no tasks is found with the specified ID, return a 404 error
      return res.status(404).json({ error: "tasks not found" });
    }

    // Update the tasks in the database
    const updateQuery =
      "UPDATE tasks SET tasks = ?, description = ? WHERE id = ?";
    await connection.query(updateQuery, [tasks, description, id]);

    // Return a success response
    res.status(200).json({ message: "Tasks updated successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error updating tasks:", error);
    res.status(500).json({ error: "Failed to update tasks" });
  }
};

// Delete tasks
export const tasksDelete = async (req, res) => {
  try {
    const { id } = req.params; // Extract the tasks ID from the request parameters

    // Check if the tasks exists in the database
    const checkQuery = "SELECT * FROM tasks WHERE id = ?";
    const [checkResults] = await connection.query(checkQuery, [id]);

    if (checkResults.length === 0) {
      // If no tasks is found with the specified ID, return a 404 error
      return res.status(404).json({ error: "tasks not found" });
    }

    // Delete the tasks from the database
    const deleteQuery = "DELETE FROM tasks WHERE id = ?";
    await connection.query(deleteQuery, [id]);

    // Return a success response
    res.status(200).json({ message: "tasks deleted successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error deleting tasks:", error);
    res.status(500).json({ error: "Failed to delete tasks" });
  }
};
