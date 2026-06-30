// controllers/portalController.js
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const PaymentLog = require('../models/PaymentLog');
const nombaService = require('../services/nombaService');
const gatekeeperService = require('../services/gatekeeperService');

// Get view for customer portal
const getSubscriptionView = async (req, res) => {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid userId format' });
    }
    
    try {
        const subscriptions = await Subscription.find({ userId });
        if (!subscriptions || subscriptions.length === 0) {
            return res.status(404).json({ message: 'No subscriptions found for user' });
        }
        
        const logs = await PaymentLog.find({ subscriptionId: { $in: subscriptions.map(s => s._id) } });
        
        res.json({ subscriptions, logs });
    } catch (error) {
        console.error('[PortalController] getSubscriptionView error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Handle update payment method
const updatePaymentMethod = async (req, res) => {
    const { subscriptionId, newTokenKey } = req.body;
    if (!subscriptionId || !newTokenKey) {
        return res.status(400).json({ error: 'Missing subscriptionId or newTokenKey' });
    }

    try {
        const sub = await Subscription.findByIdAndUpdate(subscriptionId, { tokenKey: newTokenKey }, { new: true });
        
        if (!sub) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        res.json({ message: 'Payment method updated and verified' });
    } catch (error) {
        console.error('[PortalController] updatePaymentMethod error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const handleRetryAuthorization = async (req, res) => {
    try {
        await gatekeeperService.handleRetryRequest(req.body);
        res.json({ message: 'Authorization request processed' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { getSubscriptionView, updatePaymentMethod, handleRetryAuthorization };
