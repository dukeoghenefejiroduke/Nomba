// services/analyticsService.js
const axios = require('axios');
const nombaService = require('./nombaService'); // To reuse auth logic
const BASE_URL = process.env.APP_MODE === 'live' ? 'https://api.nomba.com' : 'https://sandbox.nomba.com';
const ACCOUNT_ID = process.env.ACCOUNT_ID;

const fetchTransactions = async (dateFrom, dateTo) => {
    try {
        const token = await nombaService.authenticate();
        const response = await axios.get(`${BASE_URL}/v1/transactions/bank`, {
            params: { dateFrom, dateTo },
            headers: {
                'Authorization': `Bearer ${token}`,
                'accountId': ACCOUNT_ID,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('[Nomba API] Fetch transactions error:', error.response?.data || error.message);
        throw new Error('Failed to fetch transactions');
    }
};

module.exports = { fetchTransactions };
