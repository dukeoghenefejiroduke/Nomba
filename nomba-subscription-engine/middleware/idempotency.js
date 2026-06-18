// middleware/idempotency.js
const IdempotencyKey = require('../models/IdempotencyKey');

const checkIdempotency = async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) {
    return res.status(400).json({ error: 'Idempotency-Key header missing' });
  }

  try {
    const existing = await IdempotencyKey.findOne({ key });
    if (existing) {
      return res.status(409).json({ error: 'Duplicate request already processed' });
    }
    
    // Create the key record
    await IdempotencyKey.create({ key });
    next();
  } catch (error) {
    res.status(500).json({ error: 'Idempotency check failed' });
  }
};

module.exports = checkIdempotency;
