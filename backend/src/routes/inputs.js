const express = require('express');
const router = express.Router();
const { readDB, isMongoEnabled, mongoFind } = require('../db');

router.get('/', async (req, res) => {
  if (await isMongoEnabled()) {
    const inputs = await mongoFind('inputs', {});
    return res.json(inputs || []);
  }
  const db = await readDB();
  res.json(db.inputs || []);
});

module.exports = router;
