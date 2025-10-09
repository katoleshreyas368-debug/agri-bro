const express = require('express');
const router = express.Router();
const { readDB, writeDB, makeId, isMongoEnabled, mongoFind, mongoInsertOne } = require('../db');

router.get('/', async (req, res) => {
  if (await isMongoEnabled()) {
    const list = await mongoFind('logistics', {});
    return res.json(list || []);
  }
  const db = await readDB();
  res.json(db.logistics || []);
});

router.post('/', (req, res) => {
  (async () => {
    try {
      const { farmerId, farmerName, cropType, quantity, fromLocation, toLocation, requestedDate } = req.body;
      if (!farmerId || !cropType) return res.status(400).json({ error: 'missing_fields' });

      const newReq = { id: makeId(), farmerId, farmerName: farmerName || 'Unknown', cropType, quantity: Number(quantity) || 0, fromLocation: fromLocation || '', toLocation: toLocation || '', status: 'pending', requestedDate: requestedDate || new Date().toISOString() };
      if (await isMongoEnabled()) {
        await mongoInsertOne('logistics', newReq);
        return res.status(201).json(newReq);
      }
      const db = await readDB();
      db.logistics.unshift(newReq);
      await writeDB(db);
      res.status(201).json(newReq);
    } catch (err) {
      console.error('Create logistics error:', err);
      res.status(500).json({ error: 'internal_server_error' });
    }
  })();
});

module.exports = router;
