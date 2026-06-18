// services/dunningService.js
const Job = require('../models/Job');
const Subscription = require('../models/Subscription');
const PaymentLog = require('../models/PaymentLog');
const nombaService = require('./nombaService');

const processDunningQueue = async () => {
  const now = new Date();
  const jobs = await Job.find({ status: 'pending', scheduledTime: { $lte: now } });

  console.log(`[Dunning] Found ${jobs.length} jobs to process.`);

  for (const job of jobs) {
    console.log(`[Dunning] Processing job ${job._id} for subscription ${job.subscriptionId}`);
    const subscription = await Subscription.findById(job.subscriptionId);
    
    // Attempt charge
    const result = await nombaService.chargeToken(subscription, job.payload.amount);
    
    if (result.success) {
      // Success: Restore subscription status, clear job, log transaction
      await Subscription.findByIdAndUpdate(subscription._id, { status: 'active' });
      await PaymentLog.create({
        subscriptionId: subscription._id,
        amount: job.payload.amount,
        status: 'success',
      });
      job.status = 'processed';
      await job.save();
    } else {
      // Failure Handling (Dunning Loop):
      // 1. Log the failure.
      // 2. Check retry limit (max 3).
      // 3. If limit reached, cancel subscription.
      // 4. Otherwise, schedule next attempt with exponential back-off (24h/48h/72h).
      //    (DEMO_MODE=true overrides this delay to 1 minute for rapid demonstration).
      const retryCount = (job.payload.retryCount || 0) + 1;
      
      await PaymentLog.create({
        subscriptionId: subscription._id,
        amount: job.payload.amount,
        status: 'failed',
        retryCount: retryCount,
        errorMessage: result.message,
        reason: result.message
      });

      if (retryCount >= 3) {
        await Subscription.findByIdAndUpdate(subscription._id, { status: 'canceled' });
        job.status = 'failed';
        await job.save();
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
