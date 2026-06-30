// routes/subscriptionRoutes.js
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const checkIdempotency = require('../middleware/idempotency');
const nombaService = require('../services/nombaService');
router.post('/refund', async (req, res) => {
    try {
        const { transactionId, amount, accountNumber, bankCode } = req.body;
        const result = await nombaService.refundTransaction(transactionId, amount, accountNumber, bankCode);
        if (result.success) {
            res.json({ message: 'Refund processed successfully', data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', subscriptionController.getAllSubscriptions);
// ...

router.post('/', checkIdempotency, subscriptionController.createSubscription);
router.post('/cancel', subscriptionController.cancelOrder);
router.get('/saved-cards/:orderReference', subscriptionController.getUserSavedCards);
router.post('/submit-card', subscriptionController.submitCardDetails);
router.get('/virtual-accounts/:identifier', subscriptionController.getVirtualAccount);
router.get('/requery/:sessionId', subscriptionController.requeryTransaction);
router.get('/transaction/:id', subscriptionController.getCheckoutTransaction);
router.post('/update-tokenized-card', subscriptionController.updateTokenizedCardData);

module.exports = router;
