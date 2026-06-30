const nombaService = require('./nombaService');
const PaymentLog = require('../models/PaymentLog');

const reconcileTransactions = async () => {
    console.log('[Reconciliation] Starting transaction sync...');
    try {
        // Fetch transactions for the last 24 hours (simplified)
        const result = await nombaService.fetchTransactionsBySubAccount(process.env.NOMBA_SUB_ACCOUNT_ID, {});

        if (result.success && result.data) {
            for (const tx of result.data) {
                // Assuming Nomba transaction data has a unique ID used as eventId
                const eventId = tx.id || tx.transactionId;
                const existing = await PaymentLog.findOne({ eventId }); 
                
                if (!existing && eventId) {
                    console.log(`[Reconciliation] Syncing missing transaction: ${eventId}`);
                    await PaymentLog.create({
                        subscriptionId: tx.metaData?.internalRef || 'unknown',
                        status: 'success',
                        amount: tx.amount,
                        eventId: eventId
                    });
                }
            }
        }
    } catch (error) {
        console.error('[Reconciliation] Error:', error.message);
    }
};

module.exports = { reconcileTransactions };
