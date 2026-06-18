// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes');
const dunningService = require('./services/dunningService');

const app = express();

// Enable CORS for your Vercel frontend URL
app.use(cors({ origin: 'https://nomba-beta.vercel.app' })); // REPLACE WITH YOUR ACTUAL VERCEL URL
app.use(express.json());

// DB connection - using environment variable or local default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nomba-subscription';
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Routes
app.use(express.static('public'));
app.use('/api', routes);

// Dunning Scheduler
// In a real app, use a proper task runner like BullMQ.
// For the hackathon, a simple setInterval is sufficient.
setInterval(dunningService.processDunningQueue, 30 * 1000); // Check every 30 seconds

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
