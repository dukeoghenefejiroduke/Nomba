// controllers/subscriptionController.js
const Subscription = require('../models/Subscription');
const Job = require('../models/Job');
const PaymentLog = require('../models/PaymentLog');
const nombaService = require('../services/nombaService');

const createSubscription = async (req, res) => {
  try {
    const { userId, tokenKey, amount, billingCycle } = req.body;
    
    // Create Subscription
    const subscription = await Subscription.create({
      userId,
      tokenKey,
      billingCycle,
      nextBillingDate: new Date() // Simplified: immediate billing
    });
    
    // Attempt Initial Charge
    const result = await nombaService.chargeToken(subscription, amount);
    
    if (result.success) {
      await PaymentLog.create({
        subscriptionId: subscription._id,
        amount,
        status: 'success'
      });
      res.json({ message: 'Subscription created and charged', subscription });
    } else {
      // Failed, add to Dunning Queue
      await PaymentLog.create({
        subscriptionId: subscription._id,
        amount,
        status: 'failed',
        errorMessage: result.message
      });
      await Subscription.findByIdAndUpdate(subscription._id, { status: 'past_due' });
      
      // Schedule first retry in 1 minute (demo mode)
      await Job.create({
        type: 'charge_retry',
        subscriptionId: subscription._id,
        payload: { amount, retryCount: 0 },
        scheduledTime: new Date(Date.now() + 60 * 1000) // 1 minute delay for demo
      });
      
      res.status(202).json({ message: 'Subscription created, initial charge failed, dunning initiated', subscription });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createSubscription };
