const Job = require('../models/Job');
const nombaService = require('./nombaService');

const processFailedTransactions = async () => {
    console.log('[FailedTransactionProcessor] Checking for failed transactions to retry...');
    try {
        const now = new Date();
        const failedJobs = await Job.find({
            type: 'failed_transaction',
            status: 'pending',
            scheduledTime: { $lte: now }
        });

        for (const job of failedJobs) {
            console.log(`[FailedTransactionProcessor] Retrying transaction for subscription ${job.subscriptionId}`);
            
            // Re-attempt based on type in payload
            if (job.payload.type === 'chargeToken') {
                const { subAccountId, amount } = job.payload;
                // Assuming we have a way to fetch subscription object
                // In a real app we would populate or fetch subscription
                // For now, let's assume we can fetch subscription
                const Subscription = require('../models/Subscription');
                const subscription = await Subscription.findById(job.subscriptionId);

                if (subscription) {
                  const result = await nombaService.chargeToken(subAccountId, subscription, amount);
                  if (result.success) {
                    job.status = 'processed';
                  } else {
                    // Maybe update scheduledTime for backoff?
                    job.scheduledTime = new Date(Date.now() + 10 * 60 * 1000); // Retry later
                  }
                } else {
                  job.status = 'failed';
                }
            } else {
                job.status = 'failed'; // Unknown type
            }
            await job.save();
        }
    } catch (err) {
        console.error('[FailedTransactionProcessor] Error processing failed transactions:', err);
    }
};

module.exports = { processFailedTransactions };
