// scripts/reconciliation.js
const mongoose = require('mongoose');
const PaymentLog = require('../models/PaymentLog');
const nombaService = require('../services/nombaService');
require('dotenv').config();

const reconcileTransactions = async () => {
    console.log('[Reconcile] Starting comprehensive daily audit...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nomba-subscription');
    
    const SUB_ACCOUNT_ID = process.env.NOMBA_SUB_ACCOUNT_ID;
    
    // 1. Proactive audit for logs that are still 'pending' or 'failed'
    const logs = await PaymentLog.find({ status: { $in: ['pending', 'failed'] } });
    console.log(`[Reconcile] Auditing ${logs.length} logs for recovery...`);
    
    for (const log of logs) {
        // Querying by subscriptionId which we mapped to merchantTxRef in our controller
        const nombaData = await nombaService.requeryTransaction(SUB_ACCOUNT_ID, log.subscriptionId.toString());
        
        if (nombaData.success && nombaData.data.status === 'SUCCESS') {
            await PaymentLog.findByIdAndUpdate(log._id, { status: 'success' });
            console.log(`[Reconcile] Fixed log ${log._id} to 'success'`);
        }
    }
    
    // 2. Comprehensive Daily Audit: Detect missing records
    console.log('[Reconcile] Running bulk audit for last 24 hours...');
    const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Assuming a bulk fetch method exists in nombaService
    const nombaBulk = await nombaService.fetchTransactionsBySubAccount(SUB_ACCOUNT_ID, { dateFrom });
    
    if (nombaBulk.success) {
        for (const txn of nombaBulk.data.results) {
            const exists = await PaymentLog.findOne({ subscriptionId: txn.merchantTxRef });
            if (!exists) {
                console.warn(`[Reconcile] DISCREPANCY DETECTED: Transaction ${txn.id} on Nomba missing locally.`);
                // In a real system, we'd trigger an alert here.
            }
        }
    }
    
    console.log('[Reconcile] Reconciliation audit complete.');
    process.exit(0);
};

if (require.main === module) {
    reconcileTransactions();
}
