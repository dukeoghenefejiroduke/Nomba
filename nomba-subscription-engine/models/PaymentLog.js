const mongoose = require('mongoose');

const paymentLogSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  retryCount: { type: Number, default: 0 },
  errorMessage: String,
  reason: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PaymentLog', paymentLogSchema);
