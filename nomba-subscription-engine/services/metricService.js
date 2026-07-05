const PaymentLog = require('../models/PaymentLog');
const Subscription = require('../models/Subscription');

const calculateMetrics = async () => {
    const logs = await PaymentLog.find();
    const subscriptions = await Subscription.find();
    
    // Funnel metrics
    const totalAttempts = logs.filter(log => !log.retryCount).length;
    const totalFailures = logs.filter(log => log.status === 'failed').length;
    const pendingAuth = logs.filter(log => log.status === 'FAILED_PENDING_AUTH').length;
    const successfulRecoveries = logs.filter(log => log.status === 'success' && log.retryCount > 0).length;
    
    // Calculate Auto-Recovery Rate: (Successful retries) / (Total initial failed payments)
    const initialFailures = logs.filter(log => log.status === 'failed' && !log.retryCount).length;
    const autoRecoveryRate = initialFailures > 0 ? (successfulRecoveries / initialFailures) * 100 : 0;
    
    // Revenue and churn
    const churnRiskRate = subscriptions.filter(s => s.status === 'past_due').length / subscriptions.length * 100 || 0;
    const totalRevenue = logs.filter(log => log.status === 'success').reduce((sum, log) => sum + log.amount, 0);

    return { 
        totalRevenue, 
        churnRiskRate: parseFloat(churnRiskRate.toFixed(2)), 
        autoRecoveryRate: parseFloat(autoRecoveryRate.toFixed(2)),
        totalAttempts,
        totalFailures,
        pendingAuth,
        successfulRecoveries
    };
};

module.exports = { calculateMetrics };
