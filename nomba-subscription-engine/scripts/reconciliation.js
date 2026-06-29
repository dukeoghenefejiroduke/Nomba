// scripts/reconciliation.js
const mongoose = require('mongoose');
const PaymentLog = require('../models/PaymentLog');
const nombaService = require('../services/nombaService');
require('dotenv').config();

const reconcileTransactions = async () => {
    console.log('[Reconcile] Starting automated sanity check reconciliation...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    
    // Fetch pending/failed logs
    const logs = await PaymentLog.find({ status: { $in: ['pending', 'failed'] } });
    console.log(`[Reconcile] Found ${logs.length} logs to requery.`);
    
    for (const log of logs) {
        if (!log.transactionId) continue;
        
        console.log(`[Reconcile] Requerying ${log.transactionId}...`);
        const nombaData = await nombaService.requeryTransaction(log.transactionId);
        
        if (nombaData.success && nombaData.data.status === 'SUCCESS') {
            console.log(`[Reconcile] UPDATING: Log ${log._id} verified as SUCCESS on Nomba.`);
            await PaymentLog.findByIdAndUpdate(log._id, { status: 'success' });
        } else {
            console.warn(`[Reconcile] VERIFIED: Log ${log._id} still ${log.status}. Nomba msg: ${nombaData.message}`);
        }
    }
    
    console.log('[Reconcile] Reconciliation complete.');
    process.exit(0);
};

reconcileTransactions();
