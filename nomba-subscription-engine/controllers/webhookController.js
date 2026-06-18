// controllers/webhookController.js
const Subscription = require('../models/Subscription');

const handleWebhook = async (req, res) => {
  // Simplified signature verification
  const signature = req.headers['x-nomba-signature'];
  if (signature !== 'secret_token') {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, subscriptionId } = req.body;
  
  if (event === 'subscription.canceled') {
    await Subscription.findByIdAndUpdate(subscriptionId, { status: 'canceled' });
  }
  
  res.sendStatus(200);
};

module.exports = { handleWebhook };
