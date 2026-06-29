// services/eventOrchestrator.js
const { ERROR_CATEGORIES } = require('./errorClassifier');
const Job = require('../models/Job');
const PaymentLog = require('../models/PaymentLog');
const Subscription = require('../models/Subscription');

const handleFailure = async (result, subscription, amount, retryCount) => {
    const { category, code, message } = result;
    
    // Log decision
    await PaymentLog.create({
        subscriptionId: subscription._id,
        amount,
        status: 'failed',
        retryCount,
        errorMessage: message,
        reason: category, // Saving intelligence decision
    });

    console.log(`[Orchestrator] Classified error as ${category}. Decision: ${message}`);

    switch (category) {
        case ERROR_CATEGORIES.TRANSIENT_NETWORK:
            // Immediate retry
            await triggerRetry(subscription, amount, retryCount);
            break;
            
        case ERROR_CATEGORIES.GATEWAY_DOWN:
            // Queue for 'Recovery Monitor'
            console.log(`[Orchestrator] Queueing subscription ${subscription._id} for gateway restoration.`);
            break;
            
        case ERROR_CATEGORIES.INSUFFICIENT_FUNDS:
            // Transition to FAILED_PENDING_AUTH
            await Subscription.findByIdAndUpdate(subscription._id, { status: 'FAILED_PENDING_AUTH' });
            break;
            
        case ERROR_CATEGORIES.HARD_FAILURE:
            // Manual intervention
            await Subscription.findByIdAndUpdate(subscription._id, { status: 'canceled', lastFailureReason: 'HARD_FAILURE' });
            break;
    }
};

const triggerRetry = async (subscription, amount, retryCount) => {
    console.log(`[Orchestrator] Retrying charge for ${subscription._id}`);
    // Trigger existing Dunning engine logic
};

module.exports = { handleFailure };
