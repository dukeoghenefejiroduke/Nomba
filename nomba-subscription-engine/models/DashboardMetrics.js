const mongoose = require('mongoose');

const dashboardMetricsSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, index: true },
  totalRevenue: { type: Number, default: 0 },
  // Subscriptions currently in 'past_due' status
  churnRiskRate: { type: Number, default: 0 },
  // Percentage of 'past_due' subscriptions that recovered to 'active'
  autoRecoveryRate: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('DashboardMetrics', dashboardMetricsSchema);
