// services/escalationService.js
const AuthorizationRequest = require('../models/AuthorizationRequest');
const notificationService = require('./notificationService');

const runEscalation = async () => {
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const pending = await AuthorizationRequest.find({
        authStatus: 'pending',
        createdAt: { $lt: threshold }
    });

    for (const req of pending) {
        // Trigger second notification
        console.log(`[Escalation] Sending final reminder for ${req.transactionId}`);
    }
};

module.exports = { runEscalation };
