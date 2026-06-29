// services/failSafeBuffer.js
const fs = require('fs');
const path = require('path');

const bufferPath = path.join(__dirname, '../data/failSafe.json');

const logToBuffer = (data) => {
    try {
        const buffer = fs.existsSync(bufferPath) ? JSON.parse(fs.readFileSync(bufferPath)) : [];
        buffer.push({ ...data, timestamp: new Date() });
        fs.writeFileSync(bufferPath, JSON.stringify(buffer));
        console.error('[FailSafe] Transaction logged to local buffer.');
    } catch (err) {
        console.error('[FailSafe] Critical failure logging to buffer:', err);
    }
};

module.exports = { logToBuffer };
