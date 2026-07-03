const Job = require('../models/Job');

const logFailedTransaction = async (subscription, payload) => {
  try {
    const failedJob = new Job({
      type: 'failed_transaction',
      subscriptionId: subscription._id,
      payload: payload,
      scheduledTime: new Date(Date.now() + 5 * 60 * 1000), // Retry after 5 minutes
      status: 'pending'
    });
    await failedJob.save();
    console.log('[FailedTransaction] Transaction logged to failed_queue.');
  } catch (err) {
    console.error('[FailedTransaction] Error logging to failed_queue:', err);
  }
};

module.exports = { logFailedTransaction };
