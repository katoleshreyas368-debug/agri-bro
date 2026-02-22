const { isMongoEnabled, mongoFindOne, readDB } = require('./db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'agribro_super_secret_key_123';

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization header missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'unauthorized', message: 'Token missing.' });
  }

  // DEMO BYPASS FOR LOGISTICS
  if (token === 'demo_farmer_token') {
    req.user = { id: 'demo_farmer', name: 'Demo Farmer', type: 'farmer' };
    return next();
  }
  if (token === 'demo_transporter_token') {
    req.user = { id: 'demo_transporter', name: 'Demo Transporter', type: 'transporter' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.id) throw new Error('Invalid token format');

    let user;
    if (await isMongoEnabled()) {
      user = await mongoFindOne('users', { id: decoded.id });
    } else {
      const db = await readDB();
      user = (db.users || []).find(u => u.id === decoded.id);
    }

    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'User not found for the provided token.' });
    }

    req.user = user;
    next();
  } catch (err) {
    // Fallback block for legacy tokens (where token was just user id)
    let user;
    if (await isMongoEnabled()) {
      user = await mongoFindOne('users', { id: token });
    } else {
      const db = await readDB();
      user = (db.users || []).find(u => u.id === token);
    }

    if (user) {
      req.user = user;
      return next();
    }
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid token.' });
  }
};

module.exports = { requireAuth };