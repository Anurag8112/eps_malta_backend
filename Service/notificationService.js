import admin from "firebase-admin";
import fs from "fs";

// Ensure you're reading the correct service account file path
const serviceAccount = JSON.parse(
  process.env.FIREBASE_CREDENTIALS
);

console.log('serviceAccount', serviceAccount);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Sends a push notification via Firebase Cloud Messaging (FCM).
 * @param {string} token - The FCM token of the recipient device.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body message.
 * @param {object} [data] - Optional data payload.
 * @returns {Promise<object>} - FCM response.
 */
export const sendPushNotification = async (token, title, body, data = {}) => {
    const message = {
        notification: {
            title,
            body
        },
        data,
        token
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("Notification sent successfully:", response);
        return { success: true, response };
    } catch (error) {
        console.error("Error sending notification:", error);
        return { success: false, error };
    }
};

