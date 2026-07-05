const express = require('express');
const router = express.Router();
const PaymentLog = require('../models/PaymentLog');
const Subscription = require('../models/Subscription');
const Job = require('../models/Job');
const AuthorizationRequest = require('../models/AuthorizationRequest');
const { calculateMetrics } = require('../services/metricService');

router.get('/metrics', async (req, res) => {
    try {
        const metrics = await calculateMetrics();
        res.json(metrics);
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

