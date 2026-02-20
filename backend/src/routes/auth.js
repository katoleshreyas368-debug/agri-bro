const express = require('express');
const router = express.Router();
const { readDB, writeDB, makeId, isMongoEnabled, mongoFindOne, mongoInsertOne, mongoFind } = require('../db');
const { requireAuth } = require('../middleware'); // requireAuth is used for /profile

// Simple login/register that stores user in JSON
router.post('/login', async (req, res) => {
  try {
    const { name, phone, location, type } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });

    // If Mongo enabled, use the users collection directly
    if (await isMongoEnabled()) {
      let user = await mongoFindOne('users', { phone });
      if (!user) {
        // Some deployments have a unique index on `uid` (not `id`).
        // To avoid duplicate-key errors when that index exists and allows
        // no-null values, populate both `id` and `uid` with the same value.
        const genId = makeId();
        // Avoid inserting a plain string into `location` when the MongoDB
        // collection has a geospatial index on `location` (it expects an
        // array or GeoJSON object). Store free-text locations under
        // `locationName` and only set `location` when the input looks
        // like coordinates/object.
        const mongoDoc = { id: genId, uid: genId, name, phone, type: type || 'farmer' };
        // Ensure email is non-null to avoid unique-index conflicts when
        // the collection has a unique index on `email` which treats
        // missing fields as null. If client did not provide email,
        // create a unique placeholder email using the generated id.
        if (req.body && req.body.email && typeof req.body.email === 'string' && req.body.email.trim()) {
          mongoDoc.email = req.body.email.trim();
        } else {
          mongoDoc.email = `${genId}@no-email.agribro.local`;
        }
        if (location) {
          if (typeof location === 'string') {
            mongoDoc.locationName = location;
          } else if (Array.isArray(location) || typeof location === 'object') {
            // assume caller provided valid geo coordinates/GeoJSON
            mongoDoc.location = location;
          }
        }
        user = mongoDoc;
        await mongoInsertOne('users', user);
      } else {
        // User exists, check if type needs update (e.g. switching from farmer <-> transporter)
        if (type && user.type !== type) {
          await require('../db').mongoUpdateOne('users', { id: user.id }, { $set: { type } });
          user.type = type;
        }
      }
      // Normalize response so callers still see a `location` string
      const respUser = Object.assign({}, user);
      respUser.location = user.locationName || user.location || '';
      return res.json({ user: respUser, token: respUser.id }); // Return user.id as a simple token
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
    } else {
      // User exists, update type if changed
      if (type && user.type !== type) {
        user.type = type;
        await writeDB(db);
      }
    }

    res.json({ user, token: user.id }); // Return user.id as a simple token
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

// GET /auth/profile - get current user's profile
router.get('/profile', requireAuth, (req, res) => {
  // req.user is attached by the requireAuth middleware
  res.json({ user: req.user });
});

module.exports = router;
