// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const DashboardMetrics = require('../models/DashboardMetrics');

router.get('/metrics', async (req, res) => {
    try {
        // Fetch the latest metrics record
        const metrics = await DashboardMetrics.findOne().sort({ createdAt: -1 });
        if (!metrics) {
            return res.json({ totalRevenue: 0, churnRiskRate: 0, autoRecoveryRate: 0 });
        }
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
