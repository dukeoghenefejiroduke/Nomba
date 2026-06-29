// controllers/webhookController.js
const crypto = require('crypto');
const Subscription = require('../models/Subscription');

const WEBHOOK_SECRET = process.env.NOMBA_WEBHOOK_SECRET;

const handleWebhook = async (req, res) => {
  const signature = req.headers['x-nomba-signature'];

  // Cryptographic Verification: Compare HMAC of payload with header signature
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(JSON.stringify(req.body)).digest('hex');

  if (signature !== digest) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const { event, subscriptionId } = req.body;

  if (event === 'subscription.canceled') {
    await Subscription.findByIdAndUpdate(subscriptionId, { status: 'canceled' });
  }

  res.sendStatus(200);
};

module.exports = { handleWebhook };

