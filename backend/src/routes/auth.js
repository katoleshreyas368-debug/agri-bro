const express = require('express');
const router = express.Router();
const { readDB, writeDB, makeId, isMongoEnabled, mongoFindOne, mongoInsertOne, mongoFind } = require('../db');

// Simple login/register that stores user in JSON
router.post('/login', async (req, res) => {
  try {
    const { name, phone, location, type } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });

    // If Mongo enabled, use the users collection directly
    if (await isMongoEnabled()) {
      let user = await mongoFindOne('users', { phone });
      if (!user) {
        user = { id: makeId(), name, phone, location: location || '', type: type || 'farmer' };
        await mongoInsertOne('users', user);
      }
      return res.json({ user });
    }

    const db = await readDB();
    // simple find by phone
    let user = (db.users || []).find(u => u.phone === phone);
    if (!user) {
      user = {
        id: makeId(),
        name,
        phone,
        location: location || '',
        type: type || 'farmer'
      };
      db.users.push(user);
      await writeDB(db);
    }

    res.json({ user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.get('/user/:id', async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const user = await mongoFindOne('users', { id: req.params.id });
      if (!user) return res.status(404).json({ error: 'user_not_found' });
      return res.json({ user });
    }

    const db = await readDB();
    const user = (db.users || []).find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'user_not_found' });
    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// GET /users - list users (helpful for admin/debug)
router.get('/users', async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const users = await mongoFind('users', {});
      return res.json(users || []);
    }

    const db = await readDB();
    res.json(db.users || []);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

module.exports = router;
