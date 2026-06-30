// routes/merchantRoutes.js
const express = require('express');
const router = express.Router();
const merchantService = require('../services/merchantService');
const nombaService = require('../services/nombaService');
router.get('/terminals', async (req, res) => {
    try {
        const result = await nombaService.getTerminals();
        if (result.success) {
            res.json({ data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/terminals/:terminalId/status', async (req, res) => {
    try {
        const result = await nombaService.getTerminalStatus(req.params.terminalId);
        if (result.success) {
            res.json({ data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/terminals/assign', async (req, res) => {
// ...

        const { serialNumber, terminalLabel } = req.body;
        const result = await nombaService.assignTerminal(serialNumber, terminalLabel);
        if (result.success) {
            res.json({ data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/parent-balance', async (req, res) => {
// ...

        const result = await nombaService.getParentAccountBalance();
        if (result.success) {
            res.json({ data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/balance/:subAccountId', async (req, res) => {
// ...

    try {
        const result = await nombaService.getSubAccountBalance(req.params.subAccountId);
        if (result.success) {
            res.json({ data: result.data });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/retry/:transactionId', async (req, res) => {
// ...

        await merchantService.forceRetry(req.params.transactionId);
        res.json({ message: 'Retry forced' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/pause/:transactionId', async (req, res) => {
    try {
        await merchantService.pauseRetry(req.params.transactionId);
        res.json({ message: 'Retry paused' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
