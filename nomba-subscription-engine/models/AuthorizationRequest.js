const mongoose = require('mongoose');

const authorizationRequestSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentLog', required: true, index: true },
  authStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'declined'], 
    default: 'pending',
    index: true
  },
  expiryTimestamp: { type: Date, required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('AuthorizationRequest', authorizationRequestSchema);
