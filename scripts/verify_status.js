const mongoose = require('mongoose');
const Subscription = require('../nomba-subscription-engine/models/Subscription');
const PaymentLog = require('../nomba-subscription-engine/models/PaymentLog');
const Job = require('../nomba-subscription-engine/models/Job');
const AuthorizationRequest = require('../nomba-subscription-engine/models/AuthorizationRequest');

async function run() {
    try {
        const mongoUri = 'mongodb://localhost:27017/nomba-subscription';
        await mongoose.connect(mongoUri);
        console.log('--- Database Status Check ---');

        const subStatuses = await Subscription.distinct('status');
        console.log('Subscription Statuses:', subStatuses);

        const logStatuses = await PaymentLog.distinct('status');
        console.log('PaymentLog Statuses:', logStatuses);

        const jobStatuses = await Job.distinct('status');
        console.log('Job Statuses:', jobStatuses);

        const authStatuses = await AuthorizationRequest.distinct('authStatus');
        console.log('Auth Statuses:', authStatuses);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
