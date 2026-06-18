// routes/subscriptionRoutes.js
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const checkIdempotency = require('../middleware/idempotency');

router.post('/', checkIdempotency, subscriptionController.createSubscription);

module.exports = router;
