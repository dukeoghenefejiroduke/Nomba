// controllers/webhookController.js
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const PaymentLog = require('../models/PaymentLog');

const WEBHOOK_SECRET = process.env.NOMBA_WEBHOOK_SECRET;

const handleWebhook = async (req, res) => {
  const signature = req.headers['x-nomba-signature'];
  const eventId = req.headers['x-nomba-event-id']; // Assuming Nomba provides an event ID

  // Cryptographic Verification
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(JSON.stringify(req.body)).digest('hex');

  if (signature !== digest) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Idempotency check: Ensure event hasn't been processed
  const alreadyProcessed = await PaymentLog.findOne({ eventId });
  if (alreadyProcessed) {
      return res.sendStatus(200); // Already handled
  }

  const { event, subscriptionId } = req.body;

  if (event === 'subscription.canceled') {
    await Subscription.findByIdAndUpdate(subscriptionId, { status: 'canceled' });
  }

  // Persist eventId to ensure idempotency
  await PaymentLog.create({ 
      subscriptionId, 
      status: 'success', 
      amount: 0, 
      eventId 
  });

  res.sendStatus(200);
};

module.exports = { handleWebhook };


