const express = require('express');
const router = express.Router();
const { isMongoEnabled, initDB } = require('../db');

router.get('/', async (req, res) => {
  try {
    const mongo = await isMongoEnabled();
    const info = { mongo: !!mongo, websocket: true };
    if (mongo) {
      const db = await initDB();
      info.dbName = db.databaseName;
      try {
        // quick ping
        const ping = await db.command({ ping: 1 });
        info.ping = ping;
      } catch (err) {
        info.pingError = String(err.message || err);
      }
    }
    res.json({ status: 'ok', info });
  } catch (err) {
    res.status(500).json({ status: 'error', error: String(err.message || err) });
  }
});

module.exports = router;
