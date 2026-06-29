// services/gatekeeperService.js
const Subscription = require('../models/Subscription');
const PaymentLog = require('../models/PaymentLog');
const AuthorizationRequest = require('../models/AuthorizationRequest');
const Job = require('../models/Job');

const handleRetryRequest = async (authResponse) => {
    const { transactionId, status } = authResponse; // status: 'approved' or 'declined'
    const authReq = await AuthorizationRequest.findOne({ transactionId, authStatus: 'pending' });
    
    if (!authReq) throw new Error('No pending authorization request found');

    const log = await PaymentLog.findById(transactionId);
    const sub = await Subscription.findById(log.subscriptionId);

    if (status === 'approved') {
        authReq.authStatus = 'approved';
        await authReq.save();
        
        log.status = 'pending'; // Transition to allow retry
        await log.save();
        
        sub.status = 'active'; // Or back to past_due depending on flow
        await sub.save();
        
        // Trigger Dunning Engine
        await Job.create({
            type: 'charge_retry',
            subscriptionId: sub._id,
            payload: { amount: log.amount, retryCount: log.retryCount },
            scheduledTime: new Date()
        });
        
    } else {
        authReq.authStatus = 'declined';
        await authReq.save();
        
        log.status = 'failed';
        await log.save();
        
        sub.status = 'canceled';
        await sub.save();
        
        // Purge pending jobs
        await Job.updateMany({ subscriptionId: sub._id, status: 'pending' }, { status: 'failed' });
    }
};

module.exports = { handleRetryRequest };
