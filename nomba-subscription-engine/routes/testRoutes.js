const express = require('express');
const router = express.Router();
const eventBus = require('../utils/events');
const Subscription = require('../models/Subscription');
const Job = require('../models/Job');
const PaymentLog = require('../models/PaymentLog');
const { calculateMetrics } = require('../services/metricService');

router.post('/simulate-failure', async (req, res) => {
    try {
        const { type } = req.body;
        const subId = '507f1f1f8b1d4b0003b51616'; // Using a persistent dummy ID

        // 1. Create initial failed log
        const log = await PaymentLog.create({
            subscriptionId: subId,
            amount: 5000,
            status: 'failed',
            errorMessage: `Simulated ${type} failure`,
            reason: type === 'network' ? 'TRANSIENT_NETWORK' : 'INSUFFICIENT_FUNDS',
            metadata: {
                failureCategory: type === 'network' ? 'TRANSIENT_NETWORK' : 'INSUFFICIENT_FUNDS'
            }
        });

        // 2. Trigger appropriate State Machine workflow
        if (type === 'network') {
            // Transient failure: Schedule retry
            await Job.create({
                type: 'charge_retry',
                subscriptionId: subId,
                status: 'pending', // Explicitly set status
                payload: { amount: 5000, retryCount: 1 },
                scheduledTime: new Date(Date.now() - 1000) // Scheduled in the past for immediate pickup
            });
        } else if (type === 'funds') {
            // Logical failure: Transition to pending_auth and notify
            await Subscription.findByIdAndUpdate(subId, { status: 'pending_auth' });
            
            // Re-update PaymentLog with correct category for reporting
            await PaymentLog.findByIdAndUpdate(log._id, {
                'metadata.failureCategory': 'INSUFFICIENT_FUNDS'
            });

            // Trigger notification (mock)
            const notificationService = require('../services/notificationService');
            await notificationService.sendEmail(
                'customer@example.com',
                'Action Required: Payment Failed',
                'Your payment failed due to insufficient funds. Please approve a retry in the portal.'
            );
        } else if (type === 'expired') {
            // Hard failure: Cancel subscription and notify
            await Subscription.findByIdAndUpdate(subId, { status: 'canceled' });
            
            // Re-update PaymentLog with correct category for reporting
            await PaymentLog.findByIdAndUpdate(log._id, {
                'metadata.failureCategory': 'HARD_FAILURE'
            });

            // Trigger notification (mock)
            const notificationService = require('../services/notificationService');
            await notificationService.sendEmail(
                'customer@example.com',
                'Subscription Canceled',
                'Your subscription has been canceled due to an expired payment method.'
            );
        }

        // Emit event to update dashboard
        const metrics = await calculateMetrics();
        eventBus.emit('tx_update', {
            type: 'simulation',
            message: `Simulated ${type} failure`,
            timestamp: new Date(),
            metrics
        });

        res.status(200).json({ message: 'Real-world simulation scenario triggered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
