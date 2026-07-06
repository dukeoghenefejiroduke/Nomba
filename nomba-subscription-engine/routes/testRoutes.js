const express = require('express');
const router = express.Router();
const eventBus = require('../utils/events');
const PaymentLog = require('../models/PaymentLog');
const { calculateMetrics } = require('../services/metricService');

router.post('/simulate-failure', async (req, res) => {
    try {
        const { type } = req.body;
        
        // Actually create a log entry to make the dashboard update visible
        await PaymentLog.create({
            subscriptionId: '507f1f1f8b1d4b0003b51616', // Using a dummy subscription ID
            amount: 5000,
            status: 'failed',
            errorMessage: `Simulated ${type} failure`,
            reason: type === 'network' ? 'TRANSIENT_NETWORK' : 'INSUFFICIENT_FUNDS',
            metadata: {
                failureCategory: type === 'network' ? 'TRANSIENT_NETWORK' : 'INSUFFICIENT_FUNDS'
            }
        });

        // Emit event to demonstrate real-time updates
        const metrics = await calculateMetrics();
        eventBus.emit('tx_update', {
            type: 'simulation',
            message: `Simulated ${type} failure`,
            timestamp: new Date(),
            metrics
        });

        res.status(200).json({ message: 'Failure event emitted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
