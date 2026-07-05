const express = require('express');
const router = express.Router();
const eventBus = require('../utils/events');

router.post('/simulate-failure', (req, res) => {
    const { type } = req.body;
    
    // Emit event to demonstrate real-time updates
    eventBus.emit('tx_update', {
        type: 'simulation',
        message: `Simulated ${type} failure`,
        timestamp: new Date(),
        metrics: {
            autoRecoveryRate: Math.floor(Math.random() * 100) // Simulated metric change
        }
    });

    res.status(200).json({ message: 'Failure event emitted' });
});

module.exports = router;
