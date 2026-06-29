// routes/index.js
const express = require('express');
const router = express.Router();
const subscriptionRoutes = require('./subscriptionRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const portalRoutes = require('./portalRoutes');
const merchantRoutes = require('./merchantRoutes');
const webhookController = require('../controllers/webhookController');

router.use('/subscriptions', subscriptionRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/portal', portalRoutes);
router.use('/merchant', merchantRoutes);
router.post('/webhook', webhookController.handleWebhook);

module.exports = router;
