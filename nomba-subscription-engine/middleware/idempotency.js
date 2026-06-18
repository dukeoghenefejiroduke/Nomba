// middleware/idempotency.js
// Simplified idempotency check using a Map
const seenKeys = new Map();

const checkIdempotency = (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) {
    return res.status(400).json({ error: 'Idempotency-Key header missing' });
  }
  if (seenKeys.has(key)) {
    return res.status(409).json({ error: 'Duplicate request', existingResponse: seenKeys.get(key) });
  }
  
  // Store the key
  seenKeys.set(key, { status: 'processing' });
  next();
};

module.exports = checkIdempotency;
