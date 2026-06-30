// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes');
const dunningService = require('./services/dunningService');

// ... existing code ...
const app = express();

// Enable CORS for your Vercel frontend URL
app.use(cors({ origin: 'https://nomba-beta.vercel.app' })); // REPLACE WITH YOUR ACTUAL VERCEL URL
app.use(express.json());

// Startup Services
const webhookService = require('./services/webhookService');
webhookService.registerWebhook();

const reconciliationService = require('./services/reconciliationService');
setInterval(reconciliationService.reconcileTransactions, 60 * 60 * 1000); // Hourly

// DB connection - using environment variable or local default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nomba-subscription';
// ... existing code ...
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Routes
// ... existing code ...
app.use('/api', routes);

// Dunning Scheduler
const jobProcessor = require('./services/jobProcessor');
jobProcessor.startJobProcessor();

// Auth Reaper
const reaperService = require('./services/reaperService');
reaperService.startReaper();

// Recovery Monitor
const recoveryMonitor = require('./services/recoveryMonitor');
recoveryMonitor.monitorGateway();

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

