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

// GET /auth/dashboard-stats - compute dashboard analytics from user's history
router.get('/dashboard-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const type = req.user.type;

    // Gather all relevant items with timestamps
    let allItems = [];
    let itemsByName = {};
    let patterns = [];

    if (await isMongoEnabled()) {
      if (type === 'farmer') {
        const crops = (await mongoFind('crops', { farmerId: userId })) || [];
        const logistics = (await mongoFind('logistics', { farmerId: userId })) || [];
        const inputsBought = (await mongoFind('inputs', { buyerId: userId })) || [];
        allItems = [
          ...crops.map(c => ({ ...c, _type: 'crop', _ts: c.endTime || c.createdAt })),
          ...logistics.map(l => ({ ...l, _type: 'logistics', _ts: l.requestedDate || l.createdAt })),
          ...inputsBought.map(i => ({ ...i, _type: 'input', _ts: i.createdAt }))
        ];
        // Market distribution: top crop names
        crops.forEach(c => { itemsByName[c.name] = (itemsByName[c.name] || 0) + 1; });
        // Patterns
        const activeCrops = crops.filter(c => c.status === 'active').length;
        const completedTrades = crops.filter(c => c.tradeStatus === 'confirmed').length;
        const matchedLogistics = logistics.filter(l => l.status === 'matched' || l.status === 'completed').length;
        patterns = [
          { id: 1, title: 'Harvest Optimization', count: `${activeCrops} Active`, color: 'bg-yellow-400' },
          { id: 2, title: 'Logistics Efficiency', count: matchedLogistics > 0 ? 'Matched' : 'Pending', color: 'bg-blue-400' },
          { id: 3, title: 'Trade Success', count: completedTrades > 0 ? `${completedTrades} Done` : 'Open', color: 'bg-red-400' }
        ];
      } else if (type === 'buyer') {
        const cropsBought = (await mongoFind('crops', { buyerId: userId })) || [];
        const logistics = (await mongoFind('logistics', { buyerId: userId })) || [];
        allItems = [
          ...cropsBought.map(c => ({ ...c, _type: 'crop', _ts: c.acceptedAt || c.createdAt })),
          ...logistics.map(l => ({ ...l, _type: 'logistics', _ts: l.requestedDate || l.createdAt }))
        ];
        cropsBought.forEach(c => { itemsByName[c.name] = (itemsByName[c.name] || 0) + 1; });
        const confirmedTrades = cropsBought.filter(c => c.tradeStatus === 'confirmed').length;
        const pendingTrades = cropsBought.filter(c => c.tradeStatus === 'accepted').length;
        patterns = [
          { id: 1, title: 'Purchase Activity', count: `${cropsBought.length} Total`, color: 'bg-yellow-400' },
          { id: 2, title: 'Pending Trades', count: pendingTrades > 0 ? `${pendingTrades} Pending` : 'None', color: 'bg-blue-400' },
          { id: 3, title: 'Confirmed Trades', count: confirmedTrades > 0 ? `${confirmedTrades} Done` : 'Open', color: 'bg-red-400' }
        ];
      } else if (type === 'vendor') {
        const inputs = (await mongoFind('inputs', { vendorId: userId })) || [];
        allItems = inputs.map(i => ({ ...i, _type: 'input', _ts: i.createdAt }));
        inputs.forEach(i => { itemsByName[i.name] = (itemsByName[i.name] || 0) + 1; });
        const inStockCount = inputs.filter(i => i.inStock !== false).length;
        patterns = [
          { id: 1, title: 'Inventory Management', count: `${inputs.length} Items`, color: 'bg-yellow-400' },
          { id: 2, title: 'Stock Status', count: `${inStockCount} In Stock`, color: 'bg-blue-400' },
          { id: 3, title: 'Categories', count: `${new Set(inputs.map(i => i.category)).size} Types`, color: 'bg-red-400' }
        ];
      } else if (type === 'transporter') {
        const logistics = (await mongoFind('logistics', { driverId: userId })) || [];
        allItems = logistics.map(l => ({ ...l, _type: 'logistics', _ts: l.requestedDate || l.createdAt }));
        logistics.forEach(l => { itemsByName[l.cropType || 'Delivery'] = (itemsByName[l.cropType || 'Delivery'] || 0) + 1; });
        const completedJobs = logistics.filter(l => l.status === 'completed').length;
        const pendingJobs = logistics.filter(l => l.status === 'pending').length;
        patterns = [
          { id: 1, title: 'Delivery Volume', count: `${logistics.length} Jobs`, color: 'bg-yellow-400' },
          { id: 2, title: 'Completion Rate', count: completedJobs > 0 ? `${completedJobs} Done` : 'Idle', color: 'bg-blue-400' },
          { id: 3, title: 'Pending Queue', count: pendingJobs > 0 ? `${pendingJobs} Pending` : 'Clear', color: 'bg-red-400' }
        ];
      }
    } else {
      // JSON DB fallback
      const db = await readDB();
      if (type === 'farmer') {
        const crops = (db.crops || []).filter(c => c.farmerId === userId);
        const logistics = (db.logistics || []).filter(l => l.farmerId === userId);
        allItems = [
          ...crops.map(c => ({ ...c, _type: 'crop', _ts: c.endTime || c.createdAt })),
          ...logistics.map(l => ({ ...l, _type: 'logistics', _ts: l.requestedDate || l.createdAt }))
        ];
        crops.forEach(c => { itemsByName[c.name] = (itemsByName[c.name] || 0) + 1; });
        const activeCrops = crops.filter(c => c.status === 'active').length;
        const completedTrades = crops.filter(c => c.tradeStatus === 'confirmed').length;
        const matchedLogistics = logistics.filter(l => l.status === 'matched' || l.status === 'completed').length;
        patterns = [
          { id: 1, title: 'Harvest Optimization', count: `${activeCrops} Active`, color: 'bg-yellow-400' },
          { id: 2, title: 'Logistics Efficiency', count: matchedLogistics > 0 ? 'Matched' : 'Pending', color: 'bg-blue-400' },
          { id: 3, title: 'Trade Success', count: completedTrades > 0 ? `${completedTrades} Done` : 'Open', color: 'bg-red-400' }
        ];
      } else if (type === 'vendor') {
        const inputs = (db.inputs || []).filter(i => i.vendorId === userId);
        allItems = inputs.map(i => ({ ...i, _type: 'input', _ts: i.createdAt }));
        inputs.forEach(i => { itemsByName[i.name] = (itemsByName[i.name] || 0) + 1; });
        const inStockCount = inputs.filter(i => i.inStock !== false).length;
        patterns = [
          { id: 1, title: 'Inventory Management', count: `${inputs.length} Items`, color: 'bg-yellow-400' },
          { id: 2, title: 'Stock Status', count: `${inStockCount} In Stock`, color: 'bg-blue-400' },
          { id: 3, title: 'Categories', count: `${new Set(inputs.map(i => i.category)).size} Types`, color: 'bg-red-400' }
        ];
      } else if (type === 'transporter') {
        const logistics = (db.logistics || []).filter(l => l.driverId === userId);
        allItems = logistics.map(l => ({ ...l, _type: 'logistics', _ts: l.requestedDate || l.createdAt }));
        logistics.forEach(l => { itemsByName[l.cropType || 'Delivery'] = (itemsByName[l.cropType || 'Delivery'] || 0) + 1; });
        const completedJobs = logistics.filter(l => l.status === 'completed').length;
        const pendingJobs = logistics.filter(l => l.status === 'pending').length;
        patterns = [
          { id: 1, title: 'Delivery Volume', count: `${logistics.length} Jobs`, color: 'bg-yellow-400' },
          { id: 2, title: 'Completion Rate', count: completedJobs > 0 ? `${completedJobs} Done` : 'Idle', color: 'bg-blue-400' },
          { id: 3, title: 'Pending Queue', count: pendingJobs > 0 ? `${pendingJobs} Pending` : 'Clear', color: 'bg-red-400' }
        ];
      } else if (type === 'buyer') {
        const cropsBought = (db.crops || []).filter(c => c.acceptedBuyerId === userId);
        const logistics = (db.logistics || []).filter(l => l.buyerId === userId);
        allItems = [
          ...cropsBought.map(c => ({ ...c, _type: 'crop', _ts: c.acceptedAt || c.createdAt })),
          ...logistics.map(l => ({ ...l, _type: 'logistics', _ts: l.requestedDate || l.createdAt }))
        ];
        cropsBought.forEach(c => { itemsByName[c.name] = (itemsByName[c.name] || 0) + 1; });
        const confirmedTrades = cropsBought.filter(c => c.tradeStatus === 'confirmed').length;
        const pendingTrades = cropsBought.filter(c => c.tradeStatus === 'accepted').length;
        patterns = [
          { id: 1, title: 'Purchase Activity', count: `${cropsBought.length} Total`, color: 'bg-yellow-400' },
          { id: 2, title: 'Pending Trades', count: pendingTrades > 0 ? `${pendingTrades} Pending` : 'None', color: 'bg-blue-400' },
          { id: 3, title: 'Confirmed Trades', count: confirmedTrades > 0 ? `${confirmedTrades} Done` : 'Open', color: 'bg-red-400' }
        ];
      }
    }

    // ── Compute Weekly Activity (past 7 days, ending today) ──
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weekActivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = allItems.filter(item => {
        const ts = new Date(item._ts);
        return ts >= dayStart && ts < dayEnd;
      }).length;
      weekActivity.push({ day: days[d.getDay()], count });
    }
    const maxCount = Math.max(...weekActivity.map(w => w.count), 1);
    const weekBars = weekActivity.map(w => ({
      day: w.day,
      count: w.count,
      height: `${Math.max(Math.round((w.count / maxCount) * 100), 5)}%`
    }));

    // ── Peak change from last week ──
    const thisWeekTotal = weekActivity.reduce((sum, w) => sum + w.count, 0);
    // Simple peak indicator
    const peakChange = thisWeekTotal > 0 ? `+${thisWeekTotal} items` : 'No activity';

    // ── Market Distribution (top 5 items by name) ──
    const totalItems = Object.values(itemsByName).reduce((a, b) => a + b, 0);
    const colors = ['bg-brand-green', 'bg-blue-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500'];
    const marketDistribution = Object.entries(itemsByName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], idx) => ({
        name,
        value: totalItems > 0 ? `${Math.round((count / totalItems) * 100)}%` : '0%',
        count: `${count} ${count === 1 ? 'listing' : 'listings'}`,
        color: colors[idx] || 'bg-gray-400'
      }));

    // ── Peak Productivity Window (hour with most activity) ──
    const hourBuckets = new Array(24).fill(0);
    allItems.forEach(item => {
      const ts = new Date(item._ts);
      if (!isNaN(ts.getTime())) {
        hourBuckets[ts.getHours()]++;
      }
    });
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
    const peakEndHour = (peakHour + 3) % 24; // 3-hour window
    const formatHour = (h) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:00 ${ampm}`;
    };
    const peakLabel = Math.max(...hourBuckets) > 0
      ? (peakHour >= 5 && peakHour < 12 ? 'Morning Cycle' : peakHour >= 12 && peakHour < 17 ? 'Afternoon Cycle' : peakHour >= 17 && peakHour < 21 ? 'Evening Cycle' : 'Night Cycle')
      : 'No Data Yet';
    const peakTime = Math.max(...hourBuckets) > 0
      ? `${formatHour(peakHour)} — ${formatHour(peakEndHour)}`
      : 'Start listing to track';
    const peakFocus = Math.max(...hourBuckets) > 0 ? 'High Focus' : 'Awaiting Data';

    res.json({
      weekBars,
      peakChange,
      marketDistribution,
      patterns,
      peakProductivity: { label: peakLabel, time: peakTime, focus: peakFocus },
      totalItems: allItems.length
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

module.exports = router;
