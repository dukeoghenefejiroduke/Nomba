// routes/portalRoutes.js
const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');

router.get('/:userId', portalController.getSubscriptionView);
router.post('/update-payment', portalController.updatePaymentMethod);
router.post('/retry-auth', portalController.handleRetryAuthorization);

module.exports = router;
