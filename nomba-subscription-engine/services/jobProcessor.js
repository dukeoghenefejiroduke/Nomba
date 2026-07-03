// services/jobProcessor.js
const Job = require('../models/Job');
const dunningService = require('./dunningService');
const failedTransactionProcessor = require('./failedTransactionProcessor');

const startJobProcessor = () => {
  console.log('[JobProcessor] Starting durable job processor...');
  
  // Poll for pending jobs every 10 seconds
  setInterval(async () => {
    try {
      await dunningService.processDunningQueue();
      await failedTransactionProcessor.processFailedTransactions();
    } catch (error) {
      console.error('[JobProcessor] Error processing queue:', error);
    }
  }, 10000);
};

module.exports = { startJobProcessor };
