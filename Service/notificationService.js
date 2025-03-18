import admin from "firebase-admin";
import fs from "fs";

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  fs.readFileSync("./config/firebase-service-account.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Send Push Notification
 * @param {string} token - Device FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
export const sendPushNotification = async (token, title, body, data = {}) => {
  const message = {
    notification: { title, body },
    data, // Optional additional data
    token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error: error.message };
  }
};
