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

// GET /crops/my-trades - get all trades (pending and completed confirmation by the current buyer
router.get('/my-trades', requireAuth, async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const crops = await mongoFind('crops', { acceptedBuyerId: req.user.id });
      return res.json(crops || []);
    }

    const db = await readDB();
    const crops = (db.crops || []).filter(c => c.acceptedBuyerId === req.user.id);
    res.json(crops);
  } catch (err) {
    console.error('Get my-trades error:', err);
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

// ──────────────────────────────────────────────────────────────────────
// BID MANAGEMENT ENDPOINTS FOR FARMERS
// ──────────────────────────────────────────────────────────────────────

// GET /crops/:id/bids - Get all bids for a crop (farmer-only)
router.get('/:id/bids', requireAuth, async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const crop = await mongoFindOne('crops', { id: req.params.id });
      if (!crop) return res.status(404).json({ error: 'crop_not_found' });
      if (crop.farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
      
      return res.json({
        cropId: crop.id,
        cropName: crop.name,
        farmerId: crop.farmerId,
        bids: crop.bids || [],
        currentBid: crop.currentBid,
        acceptedBidId: crop.acceptedBidId,
        tradeStatus: crop.tradeStatus || 'open'
      });
    }

    const db = await readDB();
    const crop = (db.crops || []).find(c => c.id === req.params.id);
    if (!crop) return res.status(404).json({ error: 'crop_not_found' });
    if (crop.farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

    res.json({
      cropId: crop.id,
      cropName: crop.name,
      farmerId: crop.farmerId,
      bids: crop.bids || [],
      currentBid: crop.currentBid,
      acceptedBidId: crop.acceptedBidId,
      tradeStatus: crop.tradeStatus || 'open'
    });
  } catch (err) {
    console.error('Get bids error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// POST /crops/:id/accept-bid - Accept a specific bid (farmer-only)
router.post('/:id/accept-bid', requireAuth, async (req, res) => {
  try {
    const { bidId } = req.body;
    if (!bidId) return res.status(400).json({ error: 'missing_bid_id' });

    if (await isMongoEnabled()) {
      const crop = await mongoFindOne('crops', { id: req.params.id });
      if (!crop) return res.status(404).json({ error: 'crop_not_found' });
      if (crop.farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

      const acceptedBid = crop.bids.find(b => b.id === bidId);
      if (!acceptedBid) return res.status(404).json({ error: 'bid_not_found' });

      const updateData = {
        acceptedBidId: bidId,
        acceptedBuyerId: acceptedBid.buyerId,
        acceptedAmount: acceptedBid.amount,
        tradeStatus: 'accepted',
        acceptedAt: new Date().toISOString()
      };

      await mongoUpdateOne('crops', { id: req.params.id }, { $set: updateData });
      
      // Trigger notification to buyer
      await createNotificationForBuyer(acceptedBid.buyerId, crop, 'bid_accepted', {
        cropId: crop.id,
        cropName: crop.name,
        amount: acceptedBid.amount,
        farmerId: req.user.id
      });

      return res.json({
        success: true,
        message: 'Bid accepted successfully',
        crop: { ...crop, ...updateData }
      });
    }

    const db = await readDB();
    const crop = (db.crops || []).find(c => c.id === req.params.id);
    if (!crop) return res.status(404).json({ error: 'crop_not_found' });
    if (crop.farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

    const acceptedBid = crop.bids.find(b => b.id === bidId);
    if (!acceptedBid) return res.status(404).json({ error: 'bid_not_found' });

    crop.acceptedBidId = bidId;
    crop.acceptedBuyerId = acceptedBid.buyerId;
    crop.acceptedAmount = acceptedBid.amount;
    crop.tradeStatus = 'accepted';
    crop.acceptedAt = new Date().toISOString();

    await writeDB(db);

    // Trigger notification to buyer
    await createNotificationForBuyer(acceptedBid.buyerId, crop, 'bid_accepted', {
      cropId: crop.id,
      cropName: crop.name,
      amount: acceptedBid.amount,
      farmerId: req.user.id
    });

    res.json({
      success: true,
      message: 'Bid accepted successfully',
      crop
    });
  } catch (err) {
    console.error('Accept bid error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// POST /crops/:id/end-bidding - End bidding early at current highest bid
router.post('/:id/end-bidding', requireAuth, async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const crop = await mongoFindOne('crops', { id: req.params.id });
      if (!crop) return res.status(404).json({ error: 'crop_not_found' });
      if (crop.farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

      if (crop.bids.length === 0) {
        return res.status(400).json({ error: 'no_bids_to_accept' });
      }

      // Find highest bid
      const highestBid = crop.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max);

      const updateData = {
        acceptedBidId: highestBid.id,
        acceptedBuyerId: highestBid.buyerId,
        acceptedAmount: highestBid.amount,
        tradeStatus: 'accepted',
        acceptedAt: new Date().toISOString(),
        status: 'completed'
      };

      await mongoUpdateOne('crops', { id: req.params.id }, { $set: updateData });
      
      // Trigger notification to buyer
      await createNotificationForBuyer(highestBid.buyerId, crop, 'bid_accepted', {
        cropId: crop.id,
        cropName: crop.name,
        amount: highestBid.amount,
        farmerId: req.user.id
      });

      return res.json({
        success: true,
        message: 'Bidding ended and highest bid accepted',
        crop: { ...crop, ...updateData }
      });
    }

    const db = await readDB();
    const crop = (db.crops || []).find(c => c.id === req.params.id);
    if (!crop) return res.status(404).json({ error: 'crop_not_found' });
    if (crop.farmerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

    if (crop.bids.length === 0) {
      return res.status(400).json({ error: 'no_bids_to_accept' });
    }

    // Find highest bid
    const highestBid = crop.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max);

    crop.acceptedBidId = highestBid.id;
    crop.acceptedBuyerId = highestBid.buyerId;
    crop.acceptedAmount = highestBid.amount;
    crop.tradeStatus = 'accepted';
    crop.acceptedAt = new Date().toISOString();
    crop.status = 'completed';

    await writeDB(db);

    // Trigger notification to buyer
    await createNotificationForBuyer(highestBid.buyerId, crop, 'bid_accepted', {
      cropId: crop.id,
      cropName: crop.name,
      amount: highestBid.amount,
      farmerId: req.user.id
    });

    res.json({
      success: true,
      message: 'Bidding ended and highest bid accepted',
      crop
    });
  } catch (err) {
    console.error('End bidding error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// POST /crops/:id/confirm-trade - Confirm the trade (buyer-side confirmation)
router.post('/:id/confirm-trade', requireAuth, async (req, res) => {
  try {
    const { paymentStatus, paymentAmount, paymentId, razorpayPaymentId, razorpayOrderId } = req.body;

    if (await isMongoEnabled()) {
      const crop = await mongoFindOne('crops', { id: req.params.id });
      if (!crop) return res.status(404).json({ error: 'crop_not_found' });
      if (crop.acceptedBuyerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

      const updateData = {
        tradeStatus: 'confirmed',
        confirmedByBuyerAt: new Date().toISOString(),
        paymentStatus: paymentStatus || 'completed',
        paymentAmount: paymentAmount || crop.acceptedAmount,
        paymentDetails: {
          paymentId: paymentId,
          razorpayPaymentId: razorpayPaymentId,
          razorpayOrderId: razorpayOrderId,
          processedAt: new Date().toISOString()
        }
      };

      await mongoUpdateOne('crops', { id: req.params.id }, { $set: updateData });
      
      // Trigger notification to farmer
      await createNotificationForBuyer(crop.farmerId, crop, 'trade_confirmed', {
        cropId: crop.id,
        cropName: crop.name,
        amount: paymentAmount || crop.acceptedAmount,
        buyerId: req.user.id,
        paymentId: razorpayPaymentId || paymentId
      });

      return res.json({
        success: true,
        message: 'Trade confirmed with payment',
        crop: { ...crop, ...updateData }
      });
    }

    const db = await readDB();
    const crop = (db.crops || []).find(c => c.id === req.params.id);
    if (!crop) return res.status(404).json({ error: 'crop_not_found' });
    if (crop.acceptedBuyerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

    crop.tradeStatus = 'confirmed';
    crop.confirmedByBuyerAt = new Date().toISOString();
    crop.paymentStatus = paymentStatus || 'completed';
    crop.paymentAmount = paymentAmount || crop.acceptedAmount;
    crop.paymentDetails = {
      paymentId: paymentId,
      razorpayPaymentId: razorpayPaymentId,
      razorpayOrderId: razorpayOrderId,
      processedAt: new Date().toISOString()
    };

    await writeDB(db);

    // Trigger notification to farmer
    await createNotificationForBuyer(crop.farmerId, crop, 'trade_confirmed', {
      cropId: crop.id,
      cropName: crop.name,
      amount: paymentAmount || crop.acceptedAmount,
      buyerId: req.user.id,
      paymentId: razorpayPaymentId || paymentId
    });

    res.json({
      success: true,
      message: 'Trade confirmed with payment',
      crop
    });
  } catch (err) {
    console.error('Confirm trade error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});


// Helper function to create notifications
async function createNotificationForBuyer(userId, crop, notificationType, data) {
  try {
    const notificationMessages = {
      bid_accepted: `Your bid for ${crop.name} has been accepted!`,
      trade_confirmed: `Trade for ${crop.name} has been confirmed!`
    };

    const notification = {
      userId,
      type: notificationType,
      title: notificationType === 'bid_accepted' ? 'Bid Accepted' : 'Trade Confirmed',
      message: notificationMessages[notificationType] || 'New notification',
      data
    };

    if (await isMongoEnabled()) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notifObj = {
        id: notifId,
        ...notification,
        read: false,
        createdAt: new Date().toISOString()
      };
      await mongoUpdateOne('notifications', { id: notifId }, { $set: notifObj }, { upsert: true });
    } else {
      const db = await readDB();
      if (!db.notifications) db.notifications = [];
      
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.notifications.push({
        id: notifId,
        ...notification,
        read: false,
        createdAt: new Date().toISOString()
      });
      
      await writeDB(db);
    }
  } catch (err) {
    console.error('Create notification error:', err);
    // Don't fail the main operation if notification fails
  }
}

module.exports = router;
