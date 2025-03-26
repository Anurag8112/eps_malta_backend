import express from "express";
import adminRoute from "./Router/adminRoute.js";
import userRoute from "./Router/userRoute.js";
import locationRoute from "./Router/locationRoute.js";
import tasksRoute from "./Router/tasksRoute.js";
import eventsRoute from "./Router/eventsRoute.js";
import timeSheetRoute from "./Router/timeSheetRoute.js";
import clientRoute from "./Router/clientRoute.js";
import templateRoute from "./Router/templateRoute.js";
import qualificationRoute from "./Router/qualificationRoute.js";
import skillRoute from "./Router/skillsRoute.js";
import languageRoute from "./Router/languageRoute.js";
import sportRoute from "./Router/sportRoute.js";
import rosterRoute from "./Router/rosterRoute.js";
import licenseTypeRoute from "./Router/LicenseTrackerRouter/licenseTypeRoute.js";
import formsRoute from "./Router/LicenseTrackerRouter/formsRoute.js";
import licenseReportRoute from "./Router/LicenseTrackerRouter/licenseReportRoute.js";
import emailTemplateRoute from "./Router/LicenseTrackerRouter/emailTemplateRoute.js";
import notificationLogRoute from "./Router/LicenseTrackerRouter/notificationLogRoute.js";
import companiesRoute from "./Router/CompaniesRouter/companiesRoute.js";
import settingRoute from "./Router/SettingRouter/settingRoute.js";
import pushNotificationRoute from "./Router/pushNotificationRoute.js"
import feedbackRoute from "./Router/feedbackRoute.js"
import chatRoute from "./Router/chatRoute.js"
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import oas from "express-oas-generator";
import cors from "cors";
import { authenticateJWT } from "./Middleware/authenticateJWT.js";
import { connectToDatabase } from "./db/connection.js";
import { emailScheduler } from "./Scheduler/emailScheduler.js";
import { clientEmailScheduler } from "./Scheduler/emailScheduler.js";

const app = express();
const PORT = 8000;

app.use(express.json());

app.use(
  cors({
    origin: "*", // Allow all origins (Change to a specific domain if needed)
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS", // Allowed HTTP methods
    allowedHeaders: "Content-Type,Authorization", // Allowed headers
    credentials: true, // Allow cookies if needed
  })
);

oas.init(app, {});

// Upload Image Static
app.use("/uploads", express.static("uploads"));

// Establish a database connection
const connection = await connectToDatabase();

app.get("/", (req, res) => {
  res.json("Service Is Running...");
});

app.use("/admin", adminRoute);
app.use("/user", userRoute);
app.use("/location", authenticateJWT, locationRoute);
app.use("/tasks", authenticateJWT, tasksRoute);
app.use("/events", authenticateJWT, eventsRoute);
app.use("/timesheet", authenticateJWT, timeSheetRoute);
app.use("/client", authenticateJWT, clientRoute);
app.use("/template", authenticateJWT, templateRoute);
app.use("/qualification", authenticateJWT, qualificationRoute);
app.use("/skill", authenticateJWT, skillRoute);
app.use("/language", authenticateJWT, languageRoute);
app.use("/sport", authenticateJWT, sportRoute);
app.use("/roster", authenticateJWT, rosterRoute);
app.use("/push-notification", authenticateJWT, pushNotificationRoute);
app.use("/feedback", authenticateJWT, feedbackRoute);
app.use("/chat", authenticateJWT, chatRoute);

// License Tracker
app.use("/license", authenticateJWT, licenseTypeRoute);
app.use("/forms", authenticateJWT, formsRoute);
app.use("/license/report", authenticateJWT, licenseReportRoute);
app.use("/license/email/template", authenticateJWT, emailTemplateRoute);
app.use("/license/notification/log", authenticateJWT, notificationLogRoute);

// Companies
app.use("/companies", authenticateJWT, companiesRoute);

// Setting
app.use("/setting", authenticateJWT, settingRoute);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default connection;
