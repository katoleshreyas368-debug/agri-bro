const express = require('express');
const router = express.Router();
const { readDB, writeDB, makeId, isMongoEnabled, mongoFind, mongoFindOne, mongoInsertOne, mongoUpdateOne } = require('../db');
const { requireAuth } = require('../middleware');

// GET /crops
router.get('/', async (req, res) => {
  if (await isMongoEnabled()) {
    const crops = await mongoFind('crops', {});
    return res.json(crops || []);
  }
  const db = await readDB();
  res.json(db.crops || []);
});

// GET /crops/my-listings - get crops listed by the current user
router.get('/my-listings', requireAuth, async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const crops = await mongoFind('crops', { farmerId: req.user.id });
      return res.json(crops || []);
    }

    const db = await readDB();
    const crops = (db.crops || []).filter(c => c.farmerId === req.user.id);
    res.json(crops);
  } catch (err) {
    console.error('Get my-listings error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
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
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, quantity, unit, basePrice, location, imageUrl, endTime } = req.body;
    if (!name || !quantity || !basePrice) return res.status(400).json({ error: 'missing_fields' });

    const newCrop = {
      id: makeId(),
      name,
      quantity: Number(quantity),
      unit: unit || 'quintals',
      basePrice: Number(basePrice),
      currentBid: Number(basePrice),
      farmerId: req.user.id,
      farmerName: req.user.name,
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
});

// POST /crops/:id/bids - place a bid
router.post('/:id/bids', requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'missing_amount' });

    const bidAmount = Number(amount);
    if (Number.isNaN(bidAmount)) return res.status(400).json({ error: 'invalid_amount' });

    if (await isMongoEnabled()) {
      const newBid = { id: makeId(), buyerId: req.user.id, buyerName: req.user.name, amount: bidAmount, timestamp: new Date().toISOString() };
      // Atomically update only if the new bid is higher than the current one.
      const result = await mongoUpdateOne(
        'crops',
        { id: req.params.id, currentBid: { $lt: bidAmount } },
        { $push: { bids: newBid }, $set: { currentBid: bidAmount } }
      );

      if (result.matchedCount === 0) {
        // Check if the crop exists at all to give a better error message
        const crop = await mongoFindOne('crops', { id: req.params.id });
        if (!crop) return res.status(404).json({ error: 'crop_not_found' });
        return res.status(400).json({ error: 'bid_too_low' });
      }
      return res.status(201).json(newBid);
    }

    const db = await readDB();
    const crop = (db.crops || []).find(c => c.id === req.params.id);
    if (!crop) return res.status(404).json({ error: 'crop_not_found' });

    if (bidAmount <= crop.currentBid) return res.status(400).json({ error: 'bid_too_low' });

    const newBid = {
      id: makeId(),
      buyerId: req.user.id,
      buyerName: req.user.name,
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
});

// PUT /crops/:id - update a crop listing
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, quantity, unit, basePrice, location, imageUrl, endTime } = req.body;
    if (!name || !quantity || !basePrice) return res.status(400).json({ error: 'missing_fields' });

    const updateData = {
      name,
      quantity: Number(quantity),
      unit,
      basePrice: Number(basePrice),
      location,
      imageUrl,
      endTime
    };

    if (await isMongoEnabled()) {
      const crop = await mongoFindOne('crops', { id: req.params.id });
      if (!crop) return res.status(404).json({ error: 'crop_not_found' });
      if (crop.farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

      const result = await mongoUpdateOne('crops', { id: req.params.id }, { $set: updateData });
      if (result.matchedCount === 0) return res.status(404).json({ error: 'crop_not_found' });
      
      return res.json({ ...crop, ...updateData });
    }

    const db = await readDB();
    const cropIndex = (db.crops || []).findIndex(c => c.id === req.params.id);
    if (cropIndex === -1) return res.status(404).json({ error: 'crop_not_found' });
    if (db.crops[cropIndex].farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

    db.crops[cropIndex] = { ...db.crops[cropIndex], ...updateData };
    await writeDB(db);
    res.json(db.crops[cropIndex]);

  } catch (err) {
    console.error('Update crop error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// DELETE /crops/:id - delete a crop listing
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const crop = await mongoFindOne('crops', { id: req.params.id });
      if (!crop) return res.status(404).json({ error: 'crop_not_found' });
      if (crop.farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

      await mongoDeleteMany('crops', { id: req.params.id });
      return res.status(204).send();
    }

    const db = await readDB();
    const cropIndex = (db.crops || []).findIndex(c => c.id === req.params.id);
    if (cropIndex === -1) return res.status(404).json({ error: 'crop_not_found' });
    if (db.crops[cropIndex].farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

    db.crops.splice(cropIndex, 1);
    await writeDB(db);
    res.status(204).send();

  } catch (err) {
    console.error('Delete crop error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

module.exports = router;
