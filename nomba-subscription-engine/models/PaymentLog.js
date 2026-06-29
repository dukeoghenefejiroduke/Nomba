const mongoose = require('mongoose');

const paymentLogSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['success', 'failed', 'FAILED_PENDING_AUTH'], required: true },
  retryCount: { type: Number, default: 0 },
  errorMessage: String,
  reason: String,
  createdAt: { type: Date, default: Date.now },
  eventId: { type: String, index: true },
  metadata: {
      failureCategory: String,
      retryMethod: String,
      timeToRecovery: Number
  }
});

module.exports = mongoose.model('PaymentLog', paymentLogSchema);
