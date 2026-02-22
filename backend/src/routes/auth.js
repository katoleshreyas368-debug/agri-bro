const express = require('express');
const router = express.Router();
const { readDB, writeDB, makeId, isMongoEnabled, mongoFindOne, mongoInsertOne, mongoFind } = require('../db');
const { requireAuth } = require('../middleware'); // requireAuth is used for /profile

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'agribro_super_secret_key_123';

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { name, phone, email, password, location, type, photo } = req.body;
    if (!name || !phone || !password || !type) {
      return res.status(400).json({ error: 'Name, phone, password, and type are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (await isMongoEnabled()) {
      // Check if user already exists
      let user = await mongoFindOne('users', { phone });
      if (!user && email) {
        user = await mongoFindOne('users', { email: email.trim() });
      }

      if (user) {
        return res.status(400).json({ error: 'User with this phone or email already exists' });
      }

      const genId = makeId();
      const mongoDoc = {
        id: genId,
        uid: genId,
        name,
        phone,
        type: type,
        password: hashedPassword,
        photo: photo || null
      };

      if (email && typeof email === 'string' && email.trim()) {
        mongoDoc.email = email.trim();
      } else {
        mongoDoc.email = `${genId}@no-email.agribro.local`;
      }

      if (location) {
        if (typeof location === 'string') {
          mongoDoc.locationName = location;
        } else if (Array.isArray(location) || typeof location === 'object') {
          mongoDoc.location = location;
        }
      }

      await mongoInsertOne('users', mongoDoc);
      // Remove password from response
      const { password: _, ...userWithoutPassword } = mongoDoc;
      const token = jwt.sign({ id: mongoDoc.id, type: mongoDoc.type }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ user: userWithoutPassword, token });
    }

    // JSON DB fallback
    const db = await readDB();
    let user = (db.users || []).find(u => u.phone === phone || (email && u.email === email));
    if (user) {
      return res.status(400).json({ error: 'User with this phone or email already exists' });
    }

    user = {
      id: makeId(),
      name,
      phone,
      email: email || '',
      password: hashedPassword,
      location: location || '',
      type: type,
      photo: photo || null
    };
    db.users.push(user);
    await writeDB(db);

    const { password: _, ...userWithoutPassword } = user;
    const token = jwt.sign({ id: user.id, type: user.type }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Check if either email or phone is provided along with password
    const loginIdentifier = email || phone;
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }

    let user = null;

    if (await isMongoEnabled()) {
      // Look up user by email or phone
      user = await mongoFindOne('users', { $or: [{ email: loginIdentifier }, { phone: loginIdentifier }] });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // If user doesn't have a password set (legacy user), we might want to handle it or just reject
      if (!user.password) {
        return res.status(401).json({ error: 'Account needs password setup. Please sign up again.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign({ id: user.id, type: user.type }, JWT_SECRET, { expiresIn: '7d' });

      // Normalize response so callers still see a `location` string
      const respUser = Object.assign({}, user);
      respUser.location = user.locationName || user.location || '';
      delete respUser.password; // Never return password hash

      return res.json({ user: respUser, token });
    }

    // JSON DB fallback
    const db = await readDB();
    user = (db.users || []).find(u => u.phone === loginIdentifier || u.email === loginIdentifier);

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, type: user.type }, JWT_SECRET, { expiresIn: '7d' });

    const respUser = { ...user };
    delete respUser.password;
    res.json({ user: respUser, token });
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

// GET /auth/history - get current user's history based on their ID
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const type = req.user.type;
    let history = {};

    if (await isMongoEnabled()) {
      if (type === 'farmer') {
        const crops = await mongoFind('crops', { farmerId: userId });
        const logisticsRequests = await mongoFind('logistics', { farmerId: userId });
        const inputsBought = await mongoFind('inputs', { buyerId: userId }); // Assuming buyerId can be farmer
        history = { crops, logisticsRequests, inputsBought };
      } else if (type === 'buyer') {
        const cropsBought = await mongoFind('crops', { buyerId: userId });
        const logisticsRequests = await mongoFind('logistics', { buyerId: userId });
        history = { cropsBought, logisticsRequests };
      } else if (type === 'vendor') {
        const inputs = await mongoFind('inputs', { vendorId: userId });
        history = { inputs };
      } else if (type === 'transporter') {
        const logisticsRequests = await mongoFind('logistics', { driverId: userId });
        history = { logisticsRequests };
      }
      return res.json({ history });
    }

    const db = await readDB();
    if (type === 'farmer') {
      const crops = (db.crops || []).filter(c => c.farmerId === userId);
      const logisticsRequests = (db.logistics || []).filter(l => l.farmerId === userId);
      history = { crops, logisticsRequests };
    } else if (type === 'vendor') {
      const inputs = (db.inputs || []).filter(i => i.vendorId === userId);
      history = { inputs };
    } else if (type === 'transporter') {
      const logisticsRequests = (db.logistics || []).filter(l => l.driverId === userId);
      history = { logisticsRequests };
    } else if (type === 'buyer') {
      const logisticsRequests = (db.logistics || []).filter(l => l.buyerId === userId);
      history = { logisticsRequests };
    }

    res.json({ history });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

module.exports = router;
