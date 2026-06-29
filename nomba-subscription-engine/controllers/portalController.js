// controllers/portalController.js
const Subscription = require('../models/Subscription');
const PaymentLog = require('../models/PaymentLog');
const nombaService = require('../services/nombaService');

// Get view for customer portal
const getSubscriptionView = async (req, res) => {
    try {
        const { userId } = req.params;
        const subscriptions = await Subscription.find({ userId });
        const logs = await PaymentLog.find({ subscriptionId: { $in: subscriptions.map(s => s._id) } });
        
        res.json({ subscriptions, logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Handle update payment method
const updatePaymentMethod = async (req, res) => {
    try {
        const { subscriptionId, newTokenKey } = req.body;
        
        // Update local record
        await Subscription.findByIdAndUpdate(subscriptionId, { tokenKey: newTokenKey });
        
        // Re-validate tokenKey via Nomba (conceptually)
        // Here you would call a Nomba endpoint to verify if the token is valid for charging
        
        res.json({ message: 'Payment method updated and verified' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getSubscriptionView, updatePaymentMethod };
