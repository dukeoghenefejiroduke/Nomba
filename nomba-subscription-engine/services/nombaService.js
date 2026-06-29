// services/nombaService.js
// API service for Nomba interactions
const axios = require('axios');

const BASE_URL = process.env.DEMO_MODE === 'true' ? 'https://sandbox.nomba.com' : 'https://api.nomba.com';
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const CLIENT_ID = process.env.DEMO_MODE === 'true' ? process.env.TEST_CLIENT_ID : process.env.LIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.DEMO_MODE === 'true' ? process.env.TEST_PRIVATE_KEY : process.env.LIVE_PRIVATE_KEY;

let accessToken = null;
let refreshToken = null;

const authenticate = async () => {
  // If we have a token, check if we need to refresh (simplified check: always refresh if expired/missing)
  if (accessToken && refreshToken) {
    return accessToken;
  }

  try {
    const response = await axios.post(`${BASE_URL}/v1/auth/token/issue`, {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }, {
      headers: {
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });

    accessToken = response.data.data.access_token;
    refreshToken = response.data.data.refresh_token;
    return accessToken;
  } catch (error) {
    console.error('[Nomba API] Authentication error:', error.response?.data || error.message);
    throw new Error('Authentication failed');
  }
};

const refreshAccessToken = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/v1/auth/token/refresh`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });

    accessToken = response.data.data.access_token;
    refreshToken = response.data.data.refresh_token;
    return accessToken;
  } catch (error) {
    console.error('[Nomba API] Token refresh error:', error.response?.data || error.message);
    // If refresh fails, try re-authenticating from scratch
    accessToken = null;
    refreshToken = null;
    return authenticate();
  }
};

const createOrder = async (subAccountId, subscription, amount) => {
  console.log(`[Nomba API] createOrder for Subscription: ${subscription._id}, Amount: ${amount}, SubAccount: ${subAccountId}`);

  try {
    let token = await authenticate();
    
    // Attempt request, if 401, try refreshing
    try {
        return await callCreateOrder(token, subAccountId, subscription, amount);
    } catch (error) {
        if (error.response?.status === 401) {
            token = await refreshAccessToken();
            return await callCreateOrder(token, subAccountId, subscription, amount);
        }
        throw error;
    }
  } catch (error) {
    console.error('[Nomba API] createOrder error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const callCreateOrder = async (token, subAccountId, subscription, amount) => {
    const response = await axios.post(`${BASE_URL}/v1/checkout/order`, {
      subAccountId, // Included subAccountId in request body
      order: {
        orderReference: `order_${subscription._id}_${Date.now()}`,
        amount: amount.toFixed(2), // Ensure 2 decimal places
        currency: 'NGN',
        customerEmail: subscription.email || 'test@example.com',
        customerId: subscription.userId || 'default_user_id',
        accountId: ACCOUNT_ID,
        callbackUrl: 'https://merchant.com/callback',
        orderMetaData: {
            productName: subscription.planName || 'Subscription Plan',
            internalRef: subscription._id
        }
      },
      tokenizeCard: "true"
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });

    return { success: true, orderId: response.data.data.orderReference, checkoutLink: response.data.data.checkoutLink };
};

const chargeToken = async (subAccountId, subscription, amount) => {
  console.log(`[Nomba API] chargeToken for Subscription: ${subscription._id}, SubAccount: ${subAccountId}, Token: ${subscription.tokenKey}, Amount: ${amount}`);

  try {
    const token = await authenticate();
    // Scope the charge to the sub-account
    const response = await axios.post(`${BASE_URL}/v1/checkout/tokenized-card-payment`, {
      subAccountId, 
      tokenKey: subscription.tokenKey,
      amount: amount.toFixed(2)
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });
    
    return { success: response.data.code === '00', transactionId: `txn_${Date.now()}`, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] chargeToken error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const cancelOrder = async (subAccountId, orderReference) => {
  console.log(`[Nomba API] cancelOrder for Reference: ${orderReference}, SubAccount: ${subAccountId}`);

  try {
    const token = await authenticate();
    const response = await axios.post(`${BASE_URL}/v1/checkout/order/cancel`, {
      subAccountId,
      orderReference: orderReference
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });
    
    return { success: response.data.code === '00', message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] cancelOrder error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getUserSavedCards = async (orderReference, otp) => {
  console.log(`[Nomba API] getUserSavedCards for Reference: ${orderReference}`);

  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/checkout/user-card/${orderReference}`, {
      params: { otp },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return { success: response.data.code === '00', cards: response.data.data.tokenizedCardData, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] getUserSavedCards error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const submitCardDetails = async (orderReference, cardDetails, deviceInformation, saveCard = true) => {
  console.log(`[Nomba API] submitCardDetails for Reference: ${orderReference}`);

  try {
    const token = await authenticate();
    const response = await axios.post(`${BASE_URL}/v1/checkout/checkout-card-detail`, {
      cardDetails,
      orderReference,
      saveCard: saveCard.toString(),
      deviceInformation,
      key: "" // Assuming no encryption for now
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] submitCardDetails error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getVirtualAccount = async (identifier) => {
  console.log(`[Nomba API] getVirtualAccount for Identifier: ${identifier}`);

  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/accounts/virtual/${identifier}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] getVirtualAccount error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const requeryTransaction = async (sessionId) => {
  console.log(`[Nomba API] requeryTransaction for SessionId: ${sessionId}`);

  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/transactions/requery/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] requeryTransaction error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getCheckoutTransaction = async (id, idType = 'ORDER_REFERENCE') => {
  console.log(`[Nomba API] getCheckoutTransaction for ID: ${id}, Type: ${idType}`);

  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/checkout/transaction`, {
      params: { idType, id },
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] getCheckoutTransaction error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const updateTokenizedCardData = async (tokenKey, currentEmailAddress, newEmailAddress) => {
  console.log(`[Nomba API] updateTokenizedCardData for Key: ${tokenKey}`);

  try {
    const token = await authenticate();
    const response = await axios.post(`${BASE_URL}/v1/checkout/tokenized-card-data`, {
      tokenKey,
      currentEmailAddress,
      newEmailAddress
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] updateTokenizedCardData error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
// ... existing code ...

const fetchSingleTransactionByRef = async (subAccountId, queryType, queryValue) => {
  console.log(`[Nomba API] fetchSingleTransactionByRef for SubAccount: ${subAccountId}, ${queryType}: ${queryValue}`);

  try {
    const token = await authenticate();
    // Using query parameters as per docs: transactionRef, merchantTxRef, orderReference, or orderId
    const params = { [queryType]: queryValue };

    const response = await axios.get(`${BASE_URL}/v1/transactions/accounts/${subAccountId}/single`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });

    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] fetchSingleTransactionByRef error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
// ... existing code ...

const fetchTransactionsBySubAccount = async (subAccountId, params = {}) => {
  console.log(`[Nomba API] fetchTransactionsBySubAccount for SubAccount: ${subAccountId}`);

  try {
    const token = await authenticate();

    // params can contain: limit, cursor, dateFrom, dateTo
    const response = await axios.get(`${BASE_URL}/v1/transactions/accounts/${subAccountId}`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
        'Content-Type': 'application/json'
      }
    });

    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] fetchTransactionsBySubAccount error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

module.exports = { 
    createOrder, 
    chargeToken, 
    cancelOrder, 
    getUserSavedCards, 
    submitCardDetails, 
    getVirtualAccount, 
    requeryTransaction, 
    getCheckoutTransaction, 
    updateTokenizedCardData, 
    authenticate,
    fetchSingleTransactionByRef,
    fetchTransactionsBySubAccount
};



