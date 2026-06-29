const request = require('supertest');
const app = require('../app');
const nombaService = require('../services/nombaService');
const Subscription = require('../models/Subscription');
const DashboardMetrics = require('../models/DashboardMetrics');
const PaymentLog = require('../models/PaymentLog');
const IdempotencyKey = require('../models/IdempotencyKey');
const { Types } = require('mongoose');

// Manually stubbing the required modules with simple functions
nombaService.chargeToken = () => Promise.resolve({ success: true });
nombaService.cancelOrder = () => Promise.resolve({ success: true });
nombaService.getUserSavedCards = () => Promise.resolve({ success: true, cards: [] });
nombaService.submitCardDetails = () => Promise.resolve({ success: true });
nombaService.getVirtualAccount = () => Promise.resolve({ success: true, data: {} });
nombaService.requeryTransaction = () => Promise.resolve({ success: true, data: {} });
nombaService.getCheckoutTransaction = () => Promise.resolve({ success: true, data: {} });
nombaService.updateTokenizedCardData = () => Promise.resolve({ success: true });

Subscription.find = () => Promise.resolve([{ _id: new Types.ObjectId() }]);
Subscription.create = () => Promise.resolve({ _id: new Types.ObjectId() });
Subscription.findByIdAndUpdate = () => Promise.resolve({});

DashboardMetrics.findOne = () => ({
    sort: () => Promise.resolve({ totalRevenue: 100 })
});

PaymentLog.find = () => Promise.resolve([{ amount: 100 }]);
PaymentLog.create = () => Promise.resolve({});
IdempotencyKey.findOne = () => Promise.resolve(null);
IdempotencyKey.create = () => Promise.resolve({});

async function runTests() {
    console.log('Running manual API verification...');
    
    try {
        // --- Subscription Routes ---
        const res1 = await request(app).get('/api/subscriptions');
        console.log('GET /api/subscriptions:', res1.statusCode === 200 ? 'PASS' : 'FAIL');

        const res2 = await request(app)
            .post('/api/subscriptions')
            .set('x-idempotency-key', 'test-key')
            .send({ userId: 'u1', tokenKey: 't1', amount: 100 });
        if (res2.statusCode !== 200) {
            console.error('POST /api/subscriptions failed with body:', res2.body);
        }
        console.log('POST /api/subscriptions:', res2.statusCode === 200 ? 'PASS' : 'FAIL');

        const res3 = await request(app).post('/api/subscriptions/cancel').send({ orderReference: 'ref1' });
        console.log('POST /api/subscriptions/cancel:', res3.statusCode === 200 ? 'PASS' : 'FAIL');

        const res4 = await request(app).get('/api/subscriptions/saved-cards/ref1');
        console.log('GET /api/subscriptions/saved-cards/:ref:', res4.statusCode === 200 ? 'PASS' : 'FAIL');

        const res5 = await request(app).post('/api/subscriptions/submit-card').send({ orderReference: 'ref1' });
        console.log('POST /api/subscriptions/submit-card:', res5.statusCode === 200 ? 'PASS' : 'FAIL');

        const res6 = await request(app).get('/api/subscriptions/virtual-accounts/id1');
        console.log('GET /api/subscriptions/virtual-accounts/:id:', res6.statusCode === 200 ? 'PASS' : 'FAIL');

        const res7 = await request(app).get('/api/subscriptions/requery/s1');
        console.log('GET /api/subscriptions/requery/:id:', res7.statusCode === 200 ? 'PASS' : 'FAIL');

        const res8 = await request(app).get('/api/subscriptions/transaction/id1');
        console.log('GET /api/subscriptions/transaction/:id:', res8.statusCode === 200 ? 'PASS' : 'FAIL');

        const res9 = await request(app).post('/api/subscriptions/update-tokenized-card').send({});
        console.log('POST /api/subscriptions/update-tokenized-card:', res9.statusCode === 200 ? 'PASS' : 'FAIL');

        // --- Webhook ---
        const res10 = await request(app).post('/api/webhook').set('x-nomba-signature', 'invalid').send({ event: 'test' });
        console.log('POST /api/webhook (401 check):', res10.statusCode === 401 ? 'PASS' : 'FAIL');

        // --- Analytics ---
        const res11 = await request(app).get('/api/analytics/metrics');
        console.log('GET /api/analytics/metrics:', res11.statusCode === 200 ? 'PASS' : 'FAIL');

        // --- Portal ---
        const res12 = await request(app).get('/api/portal/u1');
        console.log('GET /api/portal/u1:', res12.statusCode === 200 ? 'PASS' : 'FAIL');
        
        const res13 = await request(app).post('/api/portal/update-payment').send({ subscriptionId: 's1', newTokenKey: 't1' });
        console.log('POST /api/portal/update-payment:', res13.statusCode === 200 ? 'PASS' : 'FAIL');

        console.log('Verification complete.');
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

runTests();
