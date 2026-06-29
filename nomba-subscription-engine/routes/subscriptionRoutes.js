// routes/subscriptionRoutes.js
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const checkIdempotency = require('../middleware/idempotency');

router.get('/', subscriptionController.getAllSubscriptions);
router.post('/', checkIdempotency, subscriptionController.createSubscription);
router.post('/cancel', subscriptionController.cancelOrder);
router.get('/saved-cards/:orderReference', subscriptionController.getUserSavedCards);
router.post('/submit-card', subscriptionController.submitCardDetails);
router.get('/virtual-accounts/:identifier', subscriptionController.getVirtualAccount);
router.get('/requery/:sessionId', subscriptionController.requeryTransaction);
router.get('/transaction/:id', subscriptionController.getCheckoutTransaction);
router.post('/update-tokenized-card', subscriptionController.updateTokenizedCardData);

module.exports = router;
