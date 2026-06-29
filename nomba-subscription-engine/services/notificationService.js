// services/notificationService.js
const sendEmail = (email, subject, message) => {
    console.log(`[Notification] Sending to ${email}: ${subject} - ${message}`);
};

const sendAuthRequest = (userId, transactionId) => {
    // Stub implementation
    console.log(`[Notification] Triggering Auth Request SMS/Email for User ${userId}, Transaction ${transactionId}`);
};

module.exports = { sendEmail, sendAuthRequest };
