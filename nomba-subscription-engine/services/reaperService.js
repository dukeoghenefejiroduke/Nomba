// services/reaperService.js
const AuthorizationRequest = require('../models/AuthorizationRequest');
const PaymentLog = require('../models/PaymentLog');
const Subscription = require('../models/Subscription');

const startReaper = () => {
  console.log('[Reaper] Starting Auth Request Reaper...');
  
  // Check every minute
  setInterval(async () => {
    const expiryLimit = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const expiredReqs = await AuthorizationRequest.find({
        authStatus: 'pending',
        expiryTimestamp: { $lt: new Date() }
    });

    for (const req of expiredReqs) {
        req.authStatus = 'declined';
        await req.save();

        const log = await PaymentLog.findById(req.transactionId);
        await Subscription.findByIdAndUpdate(log.subscriptionId, { status: 'canceled' });
        console.log(`[Reaper] Transaction ${req.transactionId} expired. Subscription canceled.`);
    }
  }, 60000);
};

module.exports = { startReaper };
