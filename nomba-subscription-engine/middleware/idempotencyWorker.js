// middleware/idempotencyWorker.js
const IdempotencyKey = require('../models/IdempotencyKey');

const withIdempotency = (fn) => async (...args) => {
    const key = args[0].idempotencyKey; // Assume passed in payload
    if (!key) return await fn(...args);

    const existing = await IdempotencyKey.findOne({ key });
    if (existing) return existing.result;

    const result = await fn(...args);
    await IdempotencyKey.create({ key, result });
    return result;
};

module.exports = { withIdempotency };
