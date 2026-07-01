const express = require('express');
const router = express.Router();
const PaymentLog = require('../models/PaymentLog');
const Subscription = require('../models/Subscription');
const Job = require('../models/Job');
const AuthorizationRequest = require('../models/AuthorizationRequest');

router.get('/metrics', async (req, res) => {
    try {
        const logs = await PaymentLog.find();
        const subscriptions = await Subscription.find();
        
        // Funnel metrics
        const totalAttempts = logs.filter(log => !log.retryCount).length;
        const totalFailures = logs.filter(log => log.status === 'failed').length;
        const pendingAuth = logs.filter(log => log.status === 'FAILED_PENDING_AUTH').length;
        const successfulRecoveries = logs.filter(log => log.status === 'success' && log.retryCount > 0).length;
        
        // Calculate Auto-Recovery Rate: (Successful retries) / (Total initial failed payments)
        const initialFailures = logs.filter(log => log.status === 'failed' && !log.retryCount).length;
        const autoRecoveryRate = initialFailures > 0 ? (successfulRecoveries / initialFailures) * 100 : 0;
        
        // Revenue and churn
        const churnRiskRate = subscriptions.filter(s => s.status === 'past_due').length / subscriptions.length * 100 || 0;
        const totalRevenue = logs.filter(log => log.status === 'success').reduce((sum, log) => sum + log.amount, 0);

        res.json({ 
            totalRevenue, 
            churnRiskRate: parseFloat(churnRiskRate.toFixed(2)), 
            autoRecoveryRate: parseFloat(autoRecoveryRate.toFixed(2)),
            totalAttempts,
            totalFailures,
            pendingAuth,
            successfulRecoveries
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/jobs', async (req, res) => {
    try {
        const status = req.query.status;
        const jobs = await Job.find({ status });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/transaction-details/:id', async (req, res) => {
    try {
        const log = await PaymentLog.findById(req.params.id);
        if (!log) return res.status(404).json({ error: 'Transaction log not found' });
        
        const jobs = await Job.find({ subscriptionId: log.subscriptionId });
        const authReqs = await AuthorizationRequest.find({ transactionId: log._id });
        
        res.json({ log, jobs, authReqs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/failure-trends', async (req, res) => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const trends = await PaymentLog.aggregate([
            { $match: { status: 'failed', createdAt: { $gte: oneHourAgo } } },
            { $group: { _id: '$metadata.failureCategory', count: { $sum: 1 } } }
        ]);
        res.json(trends);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

