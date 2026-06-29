// middleware/velocityCheck.js
const PaymentLog = require('../models/PaymentLog');

const checkVelocity = async (req, res, next) => {
    const { userId } = req.body;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const count = await PaymentLog.countDocuments({
        'subscription.userId': userId,
        status: 'failed',
        createdAt: { $gt: twentyFourHoursAgo }
    });

    if (count >= 3) {
        return res.status(429).json({ error: 'Too many retry attempts. Please contact support.' });
    }
    next();
};

module.exports = checkVelocity;
