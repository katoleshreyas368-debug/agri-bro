const express = require('express');
const router = express.Router();
const { readDB, writeDB, isMongoEnabled, mongoFind, mongoFindOne, mongoInsertOne, mongoUpdateOne, mongoDeleteMany } = require('../db');
const InputItem = require('../models/InputItem');

// Get all inputs or filter by category
router.get('/', async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const query = req.query.category ? { category: req.query.category } : {};
      const inputs = await mongoFind('inputs', query);
      return res.json(inputs || []);
    }
    const db = await readDB();
    let inputs = db.inputs || [];
    if (req.query.category) {
      inputs = inputs.filter(item => item.category === req.query.category);
    }
    res.json(inputs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new input
router.post('/', async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      // Ensure createdAt is set for Mongo inserts so frontend can display the time
      const doc = { ...req.body, createdAt: req.body.createdAt || new Date().toISOString() };
      const insertResult = await mongoInsertOne('inputs', doc);
      // insertResult.insertedId contains the new _id; return a consistent object
      const created = { _id: insertResult.insertedId, ...doc };
      return res.status(201).json(created);
    }
    const db = await readDB();
    const newInput = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    db.inputs = [...(db.inputs || []), newInput];
    await writeDB(db);
    res.status(201).json(newInput);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update input
router.patch('/:id', async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const result = await mongoUpdate('inputs', req.params.id, req.body);
      if (!result) {
        return res.status(404).json({ message: 'Input not found' });
      }
      return res.json(result);
    }
    const db = await readDB();
    const inputIndex = db.inputs.findIndex(i => i.id === req.params.id);
    if (inputIndex === -1) {
      return res.status(404).json({ message: 'Input not found' });
    }
    db.inputs[inputIndex] = { ...db.inputs[inputIndex], ...req.body };
    await writeDB(db);
    res.json(db.inputs[inputIndex]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete input
router.delete('/:id', async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const result = await mongoDelete('inputs', req.params.id);
      if (!result) {
        return res.status(404).json({ message: 'Input not found' });
      }
      return res.json({ message: 'Input deleted successfully' });
    }
    const db = await readDB();
    const inputIndex = db.inputs.findIndex(i => i.id === req.params.id);
    if (inputIndex === -1) {
      return res.status(404).json({ message: 'Input not found' });
    }
    db.inputs.splice(inputIndex, 1);
    await writeDB(db);
    res.json({ message: 'Input deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
