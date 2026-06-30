// routes/merchantRoutes.js
const express = require('express');
const router = express.Router();
const merchantService = require('../services/merchantService');

router.post('/retry/:transactionId', async (req, res) => {
    try {
        await merchantService.forceRetry(req.params.transactionId);
        res.json({ message: 'Retry forced' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/pause/:transactionId', async (req, res) => {
    try {
        await merchantService.pauseRetry(req.params.transactionId);
        res.json({ message: 'Retry paused' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
