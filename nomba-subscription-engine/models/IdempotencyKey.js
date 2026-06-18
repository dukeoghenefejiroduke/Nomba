const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: '24h' } // Auto-delete after 24h
});

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
