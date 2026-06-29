const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  type: { type: String, enum: ['charge_retry'], required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  payload: Object,
  scheduledTime: { type: Date, required: true, index: true },
  status: { type: String, enum: ['pending', 'processed', 'failed', 'dead_letter'], default: 'pending', index: true },
});

module.exports = mongoose.model('Job', jobSchema);
