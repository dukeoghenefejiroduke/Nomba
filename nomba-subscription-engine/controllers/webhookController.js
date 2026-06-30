const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const PaymentLog = require('../models/PaymentLog');

const WEBHOOK_SECRET = process.env.NOMBA_WEBHOOK_SECRET;

const generateSignature = (payload, secret, timeStamp) => {
    const data = payload.data || {};
    const merchant = data.merchant || {};
    const transaction = data.transaction || {};

    const eventType = payload.event_type || "";
    const requestId = payload.requestId || "";
    const userId = merchant.userId || "";
    const walletId = merchant.walletId || "";
    const transactionId = transaction.transactionId || "";
    const transactionType = transaction.type || "";
    const transactionTime = transaction.time || "";
    let transactionResponseCode = transaction.responseCode || "";

    if (transactionResponseCode === "null") {
        transactionResponseCode = "";
    }

    const hashingPayload = `${eventType}:${requestId}:${userId}:${walletId}:${transactionId}:${transactionType}:${transactionTime}:${transactionResponseCode}:${timeStamp}`;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(hashingPayload);
    return hmac.digest("base64");
};

const handleWebhook = async (req, res) => {
  const signatureValue = req.headers['nomba-signature'];
  const nombaTimeStamp = req.headers['nomba-timestamp'];
  const payload = req.body;

  if (!signatureValue || !nombaTimeStamp) {
      return res.status(401).json({ error: 'Missing signature headers' });
  }

  const generatedSignature = generateSignature(payload, WEBHOOK_SECRET, nombaTimeStamp);

  if (signatureValue.toLowerCase() !== generatedSignature.toLowerCase()) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Idempotency check: Ensure event hasn't been processed
  const eventId = payload.requestId;
  const alreadyProcessed = await PaymentLog.findOne({ eventId });
  if (alreadyProcessed) {
      return res.sendStatus(200); // Already handled
  }

  const { event_type, data } = payload;
  const subscriptionId = data.transaction?.metaData?.internalRef;

  if (event_type === 'payment_success' && subscriptionId) {
      await Subscription.findByIdAndUpdate(subscriptionId, { status: 'active' });
  } else if (event_type === 'payment_failed' && subscriptionId) {
      await Subscription.findByIdAndUpdate(subscriptionId, { status: 'past_due' });
  }

  // Persist eventId to ensure idempotency
  await PaymentLog.create({ 
      subscriptionId: subscriptionId || 'unknown',
      status: event_type === 'payment_success' ? 'success' : 'failed',
      amount: data.transaction?.transactionAmount || 0,
      eventId 
  });

  res.sendStatus(200);
};

module.exports = { handleWebhook };



