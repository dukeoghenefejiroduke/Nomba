const express = require('express');
const router = express.Router();
const eventBus = require('../utils/events');

router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    eventBus.on('tx_update', sendEvent);

    req.on('close', () => {
        eventBus.removeListener('tx_update', sendEvent);
        res.end();
    });
});

module.exports = router;
