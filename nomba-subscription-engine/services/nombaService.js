// services/nombaService.js
// API service for Nomba interactions
const axios = require('axios');

const IS_LIVE = process.env.APP_MODE === 'live';
const BASE_URL = IS_LIVE ? 'https://api.nomba.com' : 'https://sandbox.nomba.com';
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const CLIENT_ID = IS_LIVE ? process.env.LIVE_CLIENT_ID : process.env.TEST_CLIENT_ID;
const CLIENT_SECRET = IS_LIVE ? process.env.LIVE_PRIVATE_KEY : process.env.TEST_PRIVATE_KEY;

let accessToken = null;
let refreshToken = null;
let pendingAuthPromise = null;

const getAuthHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'accountId': ACCOUNT_ID,
    'Content-Type': 'application/json'
});

const authenticate = async () => {
  if (accessToken) return accessToken;
  if (pendingAuthPromise) return pendingAuthPromise;

  pendingAuthPromise = (async () => {
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
    } finally {
      pendingAuthPromise = null;
    }
  })();

  return pendingAuthPromise;
};

const refreshAccessToken = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/v1/auth/token/refresh`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }, {
      headers: getAuthHeaders(accessToken)
    });

    accessToken = response.data.data.access_token;
    refreshToken = response.data.data.refresh_token;
    return accessToken;
  } catch (error) {
    console.error('[Nomba API] Token refresh error:', error.response?.data || error.message);
    accessToken = null;
    refreshToken = null;
    return authenticate();
  }
};

const callCreateOrder = async (token, subAccountId, subscription, amount) => {
    const response = await axios.post(`${BASE_URL}/v1/checkout/order`, {
      subAccountId,
      order: {
        orderReference: `order_${subscription._id}_${Date.now()}`,
        amount: amount.toFixed(2),
        currency: 'NGN',
        customerEmail: subscription.email || 'test@example.com',
        customerId: subscription.userId || 'default_user_id',
        accountId: subAccountId,
        callbackUrl: 'https://merchant.com/callback',
        orderMetaData: {
            productName: subscription.planName || 'Subscription Plan',
            internalRef: subscription._id
        }
      },
      tokenizeCard: "true"
    }, {
      headers: getAuthHeaders(token)
    });

    return { success: true, orderId: response.data.data.orderReference, checkoutLink: response.data.data.checkoutLink };
};

const createOrder = async (subAccountId, subscription, amount) => {
  try {
    let token = await authenticate();
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

const chargeToken = async (subAccountId, subscription, amount) => {
  try {
    const token = await authenticate();
    const response = await axios.post(`${BASE_URL}/v1/checkout/tokenized-card-payment`, {
      subAccountId, 
      tokenKey: subscription.tokenKey,
      amount: amount.toFixed(2)
    }, {
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', transactionId: `txn_${Date.now()}`, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] chargeToken error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const cancelOrder = async (subAccountId, orderReference) => {
  try {
    const token = await authenticate();
    const response = await axios.post(`${BASE_URL}/v1/checkout/order/cancel`, {
      subAccountId,
      orderReference: orderReference
    }, {
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] cancelOrder error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getUserSavedCards = async (orderReference, otp) => {
  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/checkout/user-card/${orderReference}`, {
      params: { otp },
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', cards: response.data.data.tokenizedCardData, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] getUserSavedCards error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const submitCardDetails = async (orderReference, cardDetails, deviceInformation, saveCard = true) => {
  try {
    const token = await authenticate();
    const response = await axios.post(`${BASE_URL}/v1/checkout/checkout-card-detail`, {
      cardDetails,
      orderReference,
      saveCard: saveCard.toString(),
      deviceInformation,
      key: ""
    }, {
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] submitCardDetails error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getVirtualAccount = async (identifier) => {
  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/accounts/virtual/${identifier}`, {
      headers: getAuthHeaders(token)
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
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] requeryTransaction error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getCheckoutTransaction = async (id, idType = 'ORDER_REFERENCE') => {
  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/checkout/transaction`, {
      params: { idType, id },
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] getCheckoutTransaction error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const updateTokenizedCardData = async (tokenKey, currentEmailAddress, newEmailAddress) => {
  try {
    const token = await authenticate();
    const response = await axios.post(`${BASE_URL}/v1/checkout/tokenized-card-data`, {
      tokenKey,
      currentEmailAddress,
      newEmailAddress
    }, {
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] updateTokenizedCardData error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const fetchSingleTransactionByRef = async (subAccountId, queryType, queryValue) => {
  try {
    const token = await authenticate();
    const params = { [queryType]: queryValue };

    const response = await axios.get(`${BASE_URL}/v1/transactions/accounts/${subAccountId}/single`, {
      params,
      headers: getAuthHeaders(token)
    });

    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] fetchSingleTransactionByRef error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const fetchTransactionsBySubAccount = async (subAccountId, params = {}) => {
  try {
    const token = await authenticate();

    const response = await axios.get(`${BASE_URL}/v1/transactions/accounts/${subAccountId}`, {
      params,
      headers: getAuthHeaders(token)
    });

    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] fetchTransactionsBySubAccount error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getSubAccountBalance = async (subAccountId) => {
  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/accounts/${subAccountId}/balance`, {
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] getSubAccountBalance error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getParentAccountBalance = async () => {
  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/accounts/balance`, {
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] getParentAccountBalance error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const assignTerminal = async (serialNumber, terminalLabel) => {
  try {
    const token = await authenticate();
    const response = await axios.post(`${BASE_URL}/v1/terminals/assign`, {
        serialNumber,
        terminalLabel
    }, {
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] assignTerminal error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getTerminals = async () => {
  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/terminals`, {
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] getTerminals error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.description || 'API Error' };
  }
};

const getTerminalStatus = async (terminalId) => {
  try {
    const token = await authenticate();
    const response = await axios.get(`${BASE_URL}/v1/terminals/${terminalId}/status`, {
      headers: getAuthHeaders(token)
    });
    
    return { success: response.data.code === '00', data: response.data.data, message: response.data.description };
  } catch (error) {
    console.error('[Nomba API] getTerminalStatus error:', error.response?.data || error.message);
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
    fetchTransactionsBySubAccount,
    getSubAccountBalance,
    getParentAccountBalance,
    assignTerminal,
    getTerminals,
    getTerminalStatus
};
