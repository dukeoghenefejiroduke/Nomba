// services/dunningService.js
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

    // Attempt charge with sub-account scoping
    const result = await nombaService.chargeToken(SUB_ACCOUNT_ID, subscription, job.payload.amount);

    if (result.success) {
// ... existing code ...

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
      // Failure Handling (Dunning Loop):
      const retryCount = (job.payload.retryCount || 0) + 1;
      // Map Nomba error to internal categories
      const reason = result.code || 'unknown_failure';

      await Subscription.findByIdAndUpdate(subscription._id, {
        status: 'past_due',
        dunningRetryCount: retryCount,
        lastFailureReason: reason
      });

      await PaymentLog.create({
        subscriptionId: subscription._id,
        amount: job.payload.amount,
        status: 'failed',
        retryCount: retryCount,
        errorMessage: result.message,
        reason: reason
      });

      // Send failure notification
      await notificationService.sendEmail(
        subscription.email,
        'Payment Failed - Action Required',
        `Your payment for subscription ${subscription._id} failed: ${result.message}. Reason: ${reason}. We will retry in ${[24, 48, 72][retryCount - 1] || '72'} hours.`
      );

      if (retryCount >= 3) {
        await Subscription.findByIdAndUpdate(subscription._id, { status: 'canceled' });
        job.status = 'failed';
        await job.save();
        
        // Send cancellation notification
        await notificationService.sendEmail(
            subscription.email,
            'Subscription Canceled',
            `Your subscription ${subscription._id} has been canceled due to multiple failed payment attempts.`
        );
      } else {
        const delayHours = [24, 48, 72][retryCount - 1] || 72;
        const delayMs = process.env.DEMO_MODE === 'true' 
            ? 60 * 1000 // 1 minute demo override
            : delayHours * 60 * 60 * 1000;
        
        const nextScheduledTime = new Date(now.getTime() + delayMs);
        
        await Job.create({
            type: 'charge_retry',
            subscriptionId: subscription._id,
            payload: { ...job.payload, retryCount },
            scheduledTime: nextScheduledTime
        });
        
        job.status = 'processed';
        await job.save();
      }
    }
  }
};

module.exports = { processDunningQueue };
