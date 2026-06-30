// services/dunningService.js
const { classifyError, ERROR_CATEGORIES } = require('./errorClassifier');
const Job = require('../models/Job');
const Subscription = require('../models/Subscription');
const PaymentLog = require('../models/PaymentLog');
const nombaService = require('./nombaService');
const notificationService = require('./notificationService');
require('dotenv').config();

const SUB_ACCOUNT_ID = process.env.NOMBA_SUB_ACCOUNT_ID;

const processDunningQueue = async () => {
  const now = new Date();
  const jobs = await Job.find({ status: 'pending', scheduledTime: { $lte: now } });

  console.log(`[Dunning] Found ${jobs.length} jobs to process.`);

  for (const job of jobs) {
    console.log(`[Dunning] Processing job ${job._id} for subscription ${job.subscriptionId}`);
    const subscription = await Subscription.findById(job.subscriptionId);

    // Attempt charge
    const result = await nombaService.chargeToken(SUB_ACCOUNT_ID, subscription, job.payload.amount);

    if (result.success) {
      await Subscription.findByIdAndUpdate(subscription._id, { 
        status: 'active',
        dunningRetryCount: 0,
        lastFailureReason: null
      });
      await PaymentLog.create({
        subscriptionId: subscription._id,
        amount: job.payload.amount,
        status: 'success',
      });
      job.status = 'processed';
      await job.save();
    } else {
      const reasonCode = result.code || 'UNKNOWN';
      const category = classifyError(reasonCode);
      const retryCount = (job.payload.retryCount || 0) + 1;

      await PaymentLog.create({
        subscriptionId: subscription._id,
        amount: job.payload.amount,
        status: 'failed',
        retryCount: retryCount,
        errorMessage: result.message,
        reason: category
      });

      // Handle based on intelligent classification
      switch (category) {
        case ERROR_CATEGORIES.TRANSIENT_NETWORK:
            // Immediate retry or short exponential backoff
            await Job.create({
                type: 'charge_retry',
                subscriptionId: subscription._id,
                payload: { ...job.payload, retryCount },
                scheduledTime: new Date(now.getTime() + (process.env.APP_MODE === 'live' ? 5 * 60 * 1000 : 1000)) // 5 minute delay in live
            });
            break;
            
        case ERROR_CATEGORIES.GATEWAY_DOWN:
            // Longer backoff
            await Job.create({
                type: 'charge_retry',
                subscriptionId: subscription._id,
                payload: { ...job.payload, retryCount },
                scheduledTime: new Date(now.getTime() + (process.env.APP_MODE === 'live' ? 60 * 60 * 1000 : 1000)) // 1 hour delay in live
            });
            break;
            
        case ERROR_CATEGORIES.INSUFFICIENT_FUNDS:
            // Transition to PENDING_AUTH state (requiring customer intervention)
            await Subscription.findByIdAndUpdate(subscription._id, { status: 'pending_auth' });
            await notificationService.sendEmail(
                subscription.email,
                'Action Required: Payment Failed',
                'Your payment failed due to insufficient funds. Please update your payment method or approve a retry in the portal.'
            );
            break;

        case ERROR_CATEGORIES.HARD_FAILURE:
        default:
            // Cancel immediately
            await Subscription.findByIdAndUpdate(subscription._id, { status: 'canceled' });
            await notificationService.sendEmail(
                subscription.email,
                'Subscription Canceled',
                `Your subscription has been canceled due to a non-recoverable error: ${reasonCode}.`
            );
            break;
      }
      
      job.status = 'processed';
      await job.save();
    }
  }
};

module.exports = { processDunningQueue };
