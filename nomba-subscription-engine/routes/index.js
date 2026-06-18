// routes/index.js
const express = require('express');
const router = express.Router();
const subscriptionRoutes = require('./subscriptionRoutes');
const webhookController = require('../controllers/webhookController');

router.use('/subscriptions', subscriptionRoutes);
router.post('/webhook', webhookController.handleWebhook);

module.exports = router;
