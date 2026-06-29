const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Statuses: pending (initial), active, past_due (dunning), canceled
  status: { type: String, enum: ['pending', 'active', 'past_due', 'canceled'], default: 'pending' },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  nextBillingDate: { type: Date, required: true },
  tokenKey: { type: String, required: true },
  // Dunning tracking
  dunningRetryCount: { type: Number, default: 0 },
  lastFailureReason: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
