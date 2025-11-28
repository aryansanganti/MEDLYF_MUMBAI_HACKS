const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');

router.get('/', async (req, res) => {
    try {
        console.log('GET /api/hospitals requested');
        const docs = await Hospital.find({}).lean();
        console.log(`Found ${docs.length} hospitals`);
        return res.json(docs);
    } catch (err) {
        console.error('Hospital route error:', err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
