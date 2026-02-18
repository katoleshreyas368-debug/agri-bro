const { isMongoEnabled, mongoFindOne, readDB } = require('./db');

const requireAuth = async (req, res, next) => {
  // This is a simplified token-based auth for development.
  // It expects the user's ID to be sent as a Bearer token.
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

  let user;
  if (await isMongoEnabled()) {
    user = await mongoFindOne('users', { id: token });
  } else {
    const db = await readDB();
    user = (db.users || []).find(u => u.id === token);
  }

  if (!user) {
    return res.status(401).json({ error: 'unauthorized', message: 'User not found for the provided token.' });
  }

  req.user = user;
  next();
};

module.exports = { requireAuth };