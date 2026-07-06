const mongoose = require('mongoose');
const Job = require('../models/Job');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nomba-subscription';

async function countJobs() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const totalJobs = await Job.countDocuments();
    const pendingJobs = await Job.countDocuments({ status: 'pending' });
    const pendingDunningJobs = await Job.countDocuments({ status: 'pending', type: 'charge_retry' });
    const pendingFailedTxJobs = await Job.countDocuments({ status: 'pending', type: 'failed_transaction' });

    console.log(`Total jobs: ${totalJobs}`);
    console.log(`Pending jobs: ${pendingJobs}`);
    console.log(`Pending dunning jobs: ${pendingDunningJobs}`);
    console.log(`Pending failed TX jobs: ${pendingFailedTxJobs}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

countJobs();
