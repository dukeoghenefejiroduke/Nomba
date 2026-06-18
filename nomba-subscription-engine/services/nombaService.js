// services/nombaService.js
// Mock API service for Nomba interactions

const createOrder = async (subscription, amount) => {
  console.log(`[Nomba API] createOrder for Subscription: ${subscription._id}, Amount: ${amount}`);
  // Simulate potential failure
  if (amount > 1000) { // arbitrary rule for simulation
    return { success: false, message: 'Invalid Amount' };
  }
  return { success: true, orderId: `order_${Date.now()}` };
};

const chargeToken = async (subscription, amount) => {
  console.log(`[Nomba API] chargeToken for Subscription: ${subscription._id}, Token: ${subscription.tokenKey}, Amount: ${amount}`);
  
  // Simulate random failures for demo purposes, unless it's a specific amount
  if (amount === 999) {
    return { success: false, message: 'Card Declined: Insufficient Funds' };
  }
  
  return { success: true, transactionId: `txn_${Date.now()}` };
};

module.exports = { createOrder, chargeToken };
