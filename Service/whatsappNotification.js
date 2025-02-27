import axios from "axios";
import { constants } from "../Config/constants.js";
import connection from "../index.js";

// Function to send a WhatsApp message using the WhatsApp Business API
export async function sendWhatsAppMessage(to, parameters, actionType) {
  const {
    whatsapp: {
      phoneNumberId,
      template_create,
      template_update,
      template_delete,
    },
  } = constants;

  // Get the access_token from the database
  const accessToken = await getAccessToken();

  if (!accessToken) {
    console.error("No access token found. Cannot send WhatsApp message.");
    return; // Stop the process if there's no token
  }

  // Determine the appropriate template based on actionType
  let mainTemplate;
  switch (actionType) {
    case "create":
      mainTemplate = template_create;
      break;
    case "update":
      mainTemplate = template_update;
      break;
    case "delete":
      mainTemplate = template_delete;
      break;
    default:
      console.error(`Invalid actionType: ${actionType}`);
      return; // Stop the process for invalid actionType
  }

  const messagePayload = {
    messaging_product: "whatsapp",
    to: to,
    type: "template",
    template: {
      name: mainTemplate,
      language: { code: "en_US" }, // Update if multi-language support is needed
      components: [
        {
          type: "body",
          parameters: parameters.map((param) => ({
            type: "text",
            text: param,
          })),
        },
      ],
    },
  };

  try {
    const { data } = await axios.post(
      `https://graph.facebook.com/v16.0/${phoneNumberId}/messages`,
      messagePayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("WhatsApp message sent:", data);
    return data.messages?.[0]?.id; // Safely access message ID
  } catch (error) {
    // Extract and log only the error message
    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      "Unknown error occurred";
    console.error("Error sending WhatsApp message:", errorMessage);
    // Optionally re-throw or handle further
    throw new Error(`Failed to send WhatsApp message: ${errorMessage}`);
  }
}

// Function to fetch access_token from the database
async function getAccessToken() {
  try {
    const [rows] = await connection.query(
      `SELECT access_token FROM app_setting WHERE id = ?`,
      [1]
    );
    return rows.length > 0 ? rows[0].access_token : null;
  } catch (error) {
    console.error("Error fetching access token from database:", error.message);
    return null; // Return null if there is a database error
  }
}
