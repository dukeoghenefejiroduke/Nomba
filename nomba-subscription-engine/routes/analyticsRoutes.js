// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

router.get('/transactions', async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const data = await analyticsService.fetchTransactions(dateFrom, dateTo);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
