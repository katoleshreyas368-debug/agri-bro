const express = require('express');
const router = express.Router();
const { readDB, writeDB, makeId, isMongoEnabled, mongoFind, mongoFindOne, mongoInsertOne, mongoUpdateOne } = require('../db');

// GET /crops
router.get('/', async (req, res) => {
  if (await isMongoEnabled()) {
    const crops = await mongoFind('crops', {});
    return res.json(crops || []);
  }
  const db = await readDB();
  res.json(db.crops || []);
});

// GET /crops/:id
router.get('/:id', async (req, res) => {
  if (await isMongoEnabled()) {
    const crop = await mongoFindOne('crops', { id: req.params.id });
    if (!crop) return res.status(404).json({ error: 'crop_not_found' });
    return res.json(crop);
  }

  const db = await readDB();
  const crop = (db.crops || []).find(c => c.id === req.params.id);
  if (!crop) return res.status(404).json({ error: 'crop_not_found' });
  res.json(crop);
});

// POST /crops - create new crop listing
router.post('/', (req, res) => {
  (async () => {
    try {
      const { name, quantity, unit, basePrice, farmerId, farmerName, location, imageUrl, endTime } = req.body;
      if (!name || !quantity || !basePrice || !farmerId) return res.status(400).json({ error: 'missing_fields' });

      const newCrop = {
        id: makeId(),
        name,
        quantity: Number(quantity),
        unit: unit || 'quintals',
        basePrice: Number(basePrice),
        currentBid: Number(basePrice),
        farmerId,
        farmerName: farmerName || 'Unknown',
        location: location || '',
        imageUrl: imageUrl || '/images/crops/default.jpg',
        bids: [],
        status: 'active',
        endTime: endTime || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      };
      if (await isMongoEnabled()) {
        await mongoInsertOne('crops', newCrop);
        return res.status(201).json(newCrop);
      }

      const db = await readDB();
      db.crops.unshift(newCrop);
      await writeDB(db);
      res.status(201).json(newCrop);
    } catch (err) {
      console.error('Create crop error:', err);
      res.status(500).json({ error: 'internal_server_error' });
    }
  })();
});

// POST /crops/:id/bids - place a bid
router.post('/:id/bids', (req, res) => {
  (async () => {
    try {
      const { buyerId, buyerName, amount } = req.body;
      if (!buyerId || !amount) return res.status(400).json({ error: 'missing_buyer_or_amount' });

      if (await isMongoEnabled()) {
        const crop = await mongoFindOne('crops', { id: req.params.id });
        if (!crop) return res.status(404).json({ error: 'crop_not_found' });
        const bidAmount = Number(amount);
        if (Number.isNaN(bidAmount)) return res.status(400).json({ error: 'invalid_amount' });
        if (bidAmount <= crop.currentBid) return res.status(400).json({ error: 'bid_too_low' });

        const newBid = { id: makeId(), buyerId, buyerName: buyerName || 'Anonymous', amount: bidAmount, timestamp: new Date().toISOString() };
        // push bid and update currentBid
        await mongoUpdateOne('crops', { id: req.params.id }, { $push: { bids: newBid }, $set: { currentBid: Math.max(crop.currentBid || 0, bidAmount) } });
        return res.status(201).json(newBid);
      }

      const db = await readDB();
      const crop = (db.crops || []).find(c => c.id === req.params.id);
      if (!crop) return res.status(404).json({ error: 'crop_not_found' });

      const bidAmount = Number(amount);
      if (Number.isNaN(bidAmount)) return res.status(400).json({ error: 'invalid_amount' });
      if (bidAmount <= crop.currentBid) return res.status(400).json({ error: 'bid_too_low' });

      const newBid = {
        id: makeId(),
        buyerId,
        buyerName: buyerName || 'Anonymous',
        amount: bidAmount,
        timestamp: new Date().toISOString()
      };

      crop.bids.push(newBid);
      crop.currentBid = Math.max(crop.currentBid, bidAmount);
      await writeDB(db);

      res.status(201).json(newBid);
    } catch (err) {
      console.error('Place bid error:', err);
      res.status(500).json({ error: 'internal_server_error' });
    }
  })();
});

module.exports = router;
