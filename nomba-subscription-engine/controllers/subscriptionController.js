// controllers/subscriptionController.js
const Subscription = require('../models/Subscription');
const Job = require('../models/Job');
const PaymentLog = require('../models/PaymentLog');
const nombaService = require('../services/nombaService');
require('dotenv').config();

const SUB_ACCOUNT_ID = process.env.NOMBA_SUB_ACCOUNT_ID;

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
    
    // Attempt Initial Charge with scoped sub-account
    const result = await nombaService.chargeToken(SUB_ACCOUNT_ID, subscription, amount);
    
    if (result.success) {
      await PaymentLog.create({
        subscriptionId: subscription._id,
        amount,
        status: 'success'
      });
      // Transition subscription to active
      const updatedSub = await Subscription.findByIdAndUpdate(subscription._id, { status: 'active' }, { new: true });
      res.json({ message: 'Subscription created and charged', subscription: updatedSub });
    } else {
      // Failed, add to Dunning Queue
      await PaymentLog.create({
        subscriptionId: subscription._id,
        amount,
        status: 'failed',
        errorMessage: result.message,
        reason: result.message // Mapping error message to reason
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

const cancelOrder = async (req, res) => {
    try {
        const { orderReference } = req.body;
        // Scope cancellation to sub-account
        const result = await nombaService.cancelOrder(SUB_ACCOUNT_ID, orderReference);
        
        if (result.success) {
            // Find log to identify the subscription
            const log = await PaymentLog.findById(orderReference);
            if (log) {
                await Subscription.findByIdAndUpdate(log.subscriptionId, { status: 'canceled' });
            }
            res.json({ message: 'Order cancelled successfully' });
        } else {
            res.status(400).json({ message: 'Failed to cancel order', error: result.message });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getUserSavedCards = async (req, res) => {
    try {
        const { orderReference } = req.params;
        const { otp } = req.query;
        const result = await nombaService.getUserSavedCards(orderReference, otp);
        
        if (result.success) {
            res.json({ cards: result.cards });
        } else {
            res.status(400).json({ message: 'Failed to fetch saved cards', error: result.message });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const submitCardDetails = async (req, res) => {
    try {
        const { orderReference, cardDetails, deviceInformation, saveCard } = req.body;
        const result = await nombaService.submitCardDetails(orderReference, cardDetails, deviceInformation, saveCard);
        
        if (result.success) {
            res.json({ message: 'Card details submitted successfully', data: result.data });
        } else {
            res.status(400).json({ message: 'Failed to submit card details', error: result.message });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getVirtualAccount = async (req, res) => {
    try {
        const { identifier } = req.params;
        const result = await nombaService.getVirtualAccount(identifier);
        
        if (result.success) {
            res.json({ account: result.data });
        } else {
            res.status(400).json({ message: 'Failed to fetch virtual account', error: result.message });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const requeryTransaction = async (req, res) => {
    const { sessionId } = req.params;
    if (!sessionId) {
        return res.status(400).json({ error: 'Missing sessionId parameter' });
    }
    
    try {
        const result = await nombaService.requeryTransaction(sessionId);
        
        if (result.success) {
            res.json({ data: result.data });
        } else {
            res.status(400).json({ message: 'Failed to requery transaction', error: result.message });
        }
    } catch (error) {
        console.error('[SubscriptionController] requeryTransaction error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getCheckoutTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { idType } = req.query;
        const result = await nombaService.getCheckoutTransaction(id, idType || 'ORDER_REFERENCE');
        
        if (result.success) {
            res.json({ transaction: result.data });
        } else {
            res.status(400).json({ message: 'Failed to fetch checkout transaction', error: result.message });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateTokenizedCardData = async (req, res) => {
    try {
        const { tokenKey, currentEmailAddress, newEmailAddress } = req.body;
        const result = await nombaService.updateTokenizedCardData(tokenKey, currentEmailAddress, newEmailAddress);
        
        if (result.success) {
            res.json({ message: 'Tokenized card data updated successfully', data: result.data });
        } else {
            res.status(400).json({ message: 'Failed to update tokenized card data', error: result.message });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find();
        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createSubscription, cancelOrder, getUserSavedCards, submitCardDetails, getVirtualAccount, requeryTransaction, getCheckoutTransaction, updateTokenizedCardData, getAllSubscriptions };
