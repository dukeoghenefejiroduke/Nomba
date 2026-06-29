// services/merchantService.js
const PaymentLog = require('../models/PaymentLog');
const Subscription = require('../models/Subscription');
const Job = require('../models/Job');

const pauseRetry = async (transactionId) => {
    // Logic to mark job as 'failed' or 'paused'
    return await Job.updateMany({ subscriptionId: transactionId, status: 'pending' }, { status: 'failed' });
};

const forceRetry = async (transactionId) => {
    // Logic to force a new job entry
    const log = await PaymentLog.findById(transactionId);
    return await Job.create({
        type: 'charge_retry',
        subscriptionId: log.subscriptionId,
        payload: { amount: log.amount, retryCount: 0 },
        scheduledTime: new Date()
    });
};

module.exports = { pauseRetry, forceRetry };
