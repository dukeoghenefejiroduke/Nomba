// scripts/reconciliation.js
const mongoose = require('mongoose');
const PaymentLog = require('../models/PaymentLog');
const nombaService = require('../services/nombaService');
require('dotenv').config();

const reconcileTransactions = async () => {
    console.log('[Reconcile] Starting comprehensive daily audit...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    
    const SUB_ACCOUNT_ID = process.env.NOMBA_SUB_ACCOUNT_ID;
    
    // 1. Audit pending/failed logs individually (Targeted)
    const logs = await PaymentLog.find({ status: { $in: ['pending', 'failed'] } });
    console.log(`[Reconcile] Targeted audit for ${logs.length} logs...`);
    
    for (const log of logs) {
        const merchantTxRef = log.subscriptionId.toString();
        const nombaData = await nombaService.fetchSingleTransactionByRef(SUB_ACCOUNT_ID, 'merchantTxRef', merchantTxRef);
        
        if (nombaData.success && nombaData.data.status === 'SUCCESS') {
            await PaymentLog.findByIdAndUpdate(log._id, { status: 'success' });
            console.log(`[Reconcile] Fixed log ${log._id}`);
        }
    }
    
    // 2. Comprehensive Daily Audit (Bulk)
    console.log('[Reconcile] Running bulk audit for last 24 hours...');
    const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const nombaBulk = await nombaService.fetchTransactionsBySubAccount(SUB_ACCOUNT_ID, { dateFrom });
    
    if (nombaBulk.success) {
        for (const txn of nombaBulk.data.results) {
            // Check if this Nomba txn exists in our logs
            const exists = await PaymentLog.findOne({ subscriptionId: txn.merchantTxRef });
            if (!exists) {
                console.warn(`[Reconcile] DISCREPANCY: Transaction ${txn.id} found on Nomba but missing locally.`);
                // Potential action: Alert admin or create entry
            }
        }
    }
    
    console.log('[Reconcile] Reconciliation audit complete.');
    process.exit(0);
};

reconcileTransactions();
