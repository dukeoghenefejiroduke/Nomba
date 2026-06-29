// middleware/idempotency.js
const IdempotencyKey = require('../models/IdempotencyKey');

/**
 * Enterprise-grade Idempotency Middleware.
 * Prevents double-billing in high-latency network conditions.
 */
const checkIdempotency = async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];

  if (!key) {
    return res.status(400).json({ error: 'Idempotency-Key header required for financial transactions' });
  }

  try {
    // Check if the key exists (meaning request was already processed or is processing)
    const existing = await IdempotencyKey.findOne({ key });
    
    if (existing) {
      return res.status(409).json({ 
        error: 'Duplicate request detected',
        message: 'This transaction is already being processed or has completed.'
      });
    }
    
    // Atomically register the key to prevent race conditions
    await IdempotencyKey.create({ key, createdAt: new Date() });
    
    // Attach key to request for controller usage (e.g., to update result later)
    req.idempotencyKey = key;
    
    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    res.status(500).json({ error: 'Internal server error during idempotency check' });
  }
};

module.exports = checkIdempotency;
