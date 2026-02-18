const express = require('express');
const router = express.Router();
const {
  readDB,
  writeDB,
  makeId,
  isMongoEnabled,
  mongoFind,
  mongoInsertOne,
  mongoUpdateOne
} = require('../db');
const { requireAuth } = require('../middleware');

/* =====================================================
   GET ALL LOGISTICS REQUESTS
===================================================== */
router.get('/', async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const list = await mongoFind('logistics', {});
      return res.json(list || []);
    }

    const db = await readDB();
    res.json(db.logistics || []);
  } catch (err) {
    console.error('Fetch logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   CREATE NEW REQUEST (Farmer)
===================================================== */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { cropType, quantity, fromLocation, toLocation, requestedDate } = req.body;

    if (!cropType || !quantity || !fromLocation || !toLocation) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    const newReq = {
      id: makeId(),
      farmerId: req.user.id,
      farmerName: req.user.name,
      cropType,
      quantity: Number(quantity),
      fromLocation,
      toLocation,
      requestedDate: requestedDate || new Date().toISOString(),
      status: 'pending',
      transporterId: null,
      transporterName: null,
      progress: 0,
      createdAt: new Date().toISOString()
    };

    if (await isMongoEnabled()) {
      await mongoInsertOne('logistics', newReq);
      return res.status(201).json(newReq);
    }

    const db = await readDB();
    db.logistics = db.logistics || [];
    db.logistics.unshift(newReq);
    await writeDB(db);

    res.status(201).json(newReq);
  } catch (err) {
    console.error('Create logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   ACCEPT REQUEST (Transporter)
   Status: accepted
===================================================== */
router.patch('/:id/accept', requireAuth, async (req, res) => {
  try {
    if (req.user.type !== 'transporter') {
      return res.status(403).json({ error: 'only_transporters_allowed' });
    }

    const { id } = req.params;

    if (await isMongoEnabled()) {
      await mongoUpdateOne(
        'logistics',
        { id },
        {
          $set: {
            status: 'accepted',
            transporterId: req.user.id,
            transporterName: req.user.name
          }
        }
      );
      return res.json({ success: true });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'not_found' });
    }

    db.logistics[reqIndex].status = 'accepted';
    db.logistics[reqIndex].transporterId = req.user.id;
    db.logistics[reqIndex].transporterName = req.user.name;

    await writeDB(db);
    res.json({ success: true });
  } catch (err) {
    console.error('Accept logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   START DELIVERY (Transporter)
   Status: in-transit
===================================================== */
router.patch('/:id/start', requireAuth, async (req, res) => {
  try {
    if (req.user.type !== 'transporter') {
      return res.status(403).json({ error: 'only_transporters_allowed' });
    }

    const { id } = req.params;

    if (await isMongoEnabled()) {
      await mongoUpdateOne(
        'logistics',
        { id },
        {
          $set: {
            status: 'in-transit',
            progress: 0
          }
        }
      );
      return res.json({ success: true });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'not_found' });
    }

    db.logistics[reqIndex].status = 'in-transit';
    db.logistics[reqIndex].progress = 0;

    await writeDB(db);
    res.json({ success: true });
  } catch (err) {
    console.error('Start logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   UPDATE GPS PROGRESS
===================================================== */
router.patch('/:id/progress', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'invalid_progress' });
    }

    if (await isMongoEnabled()) {
      await mongoUpdateOne(
        'logistics',
        { id },
        { $set: { progress } }
      );
      return res.json({ success: true });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'not_found' });
    }

    db.logistics[reqIndex].progress = progress;

    if (progress === 100) {
      db.logistics[reqIndex].status = 'completed';
    }

    await writeDB(db);
    res.json({ success: true });
  } catch (err) {
    console.error('Update progress error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   COMPLETE DELIVERY
===================================================== */
router.patch('/:id/complete', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (await isMongoEnabled()) {
      await mongoUpdateOne(
        'logistics',
        { id },
        {
          $set: {
            status: 'completed',
            progress: 100,
            completedAt: new Date().toISOString()
          }
        }
      );
      return res.json({ success: true });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'not_found' });
    }

    db.logistics[reqIndex].status = 'completed';
    db.logistics[reqIndex].progress = 100;
    db.logistics[reqIndex].completedAt = new Date().toISOString();

    await writeDB(db);
    res.json({ success: true });
  } catch (err) {
    console.error('Complete logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

module.exports = router;
