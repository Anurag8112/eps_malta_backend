import nodemailer from "nodemailer";
import { constants } from "../Config/constants.js";

// Function to send an email with the attached PDF file
export function sendMail(email, emailSubject, emailText, pdfBuffer, username) {
  const { clientEmail } = constants;
  // Create a Nodemailer transporter with your email credentials
  const transporter = nodemailer.createTransport({
    host: clientEmail.host,
    port: clientEmail.port,
    secure: true,
    auth: clientEmail.auth,
  });

  const mailOptions = {
    from: "timesheet@epsmalta.com",
    to: email,
    subject: emailSubject,
    html: emailText,
  };
  if (pdfBuffer) {
    mailOptions.attachments = [
      {
        filename: username,
        content: pdfBuffer,
      },
    ];
  }
  // Return a promise so that we can use async/await when calling this function
  return new Promise((resolve, reject) => {
    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        reject(error);
      } else {
        console.log("Email sent:", info.response);
        resolve();
      }
    });
  });
}
