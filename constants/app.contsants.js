export const NOTIFICATION_MESSAGE = {
    SHIFT_ADDED : {
        "subject": "New Shift Assigned 📅",
        "body" : "A new shift has been assigned to you! Check your schedule now for details.",
    },
    SHIFT_UPDATED : {
        "subject" : "Shift Update ⚡",
        "body" : "Your shift has been updated. Review the changes in your schedule to stay on track!"
    },
    NEW_MESSAGE_RECIEVED : {
        "subject" : "New Message Received! 📩",
        "body" : "You have a new message waiting. Tap to read and reply now! 🚀",
    }
}

export const ENUM_NOTIFICATION_TYPE = Object.freeze({
    SHIFT_ADDED: "SHIFT_ADDED",
    SHIFT_UPDATED: "SHIFT_UPDATED"
});

