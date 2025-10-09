const express = require('express');
const router = express.Router();
const { readDB, writeDB, makeId, isMongoEnabled, mongoFind, mongoInsertOne, mongoUpdateOne } = require('../db');

router.get('/', async (req, res) => {
  if (await isMongoEnabled()) {
    const posts = await mongoFind('community', {});
    return res.json(posts || []);
  }
  const db = await readDB();
  res.json(db.community || []);
});

router.post('/', (req, res) => {
  (async () => {
    try {
      const { authorId, authorName, title, content } = req.body;
      if (!authorId || !title || !content) return res.status(400).json({ error: 'missing_fields' });

      const newPost = { id: makeId(), authorId, authorName: authorName || 'Anonymous', title, content, timestamp: new Date().toISOString(), replies: [] };
      if (await isMongoEnabled()) {
        await mongoInsertOne('community', newPost);
        return res.status(201).json(newPost);
      }
      const db = await readDB();
      db.community.unshift(newPost);
      await writeDB(db);
      res.status(201).json(newPost);
    } catch (err) {
      console.error('Create post error:', err);
      res.status(500).json({ error: 'internal_server_error' });
    }
  })();
});

router.post('/:id/replies', (req, res) => {
  (async () => {
    try {
      const { authorId, authorName, content } = req.body;
      if (!authorId || !content) return res.status(400).json({ error: 'missing_fields' });

      const newReply = { id: makeId(), authorId, authorName: authorName || 'Anonymous', content, timestamp: new Date().toISOString() };
      if (await isMongoEnabled()) {
        const post = await mongoFindOne('community', { id: req.params.id });
        if (!post) return res.status(404).json({ error: 'post_not_found' });
        await mongoUpdateOne('community', { id: req.params.id }, { $push: { replies: newReply } });
        return res.status(201).json(newReply);
      }
      const db = await readDB();
      const post = (db.community || []).find(p => p.id === req.params.id);
      if (!post) return res.status(404).json({ error: 'post_not_found' });
      post.replies.push(newReply);
      await writeDB(db);
      res.status(201).json(newReply);
    } catch (err) {
      console.error('Create reply error:', err);
      res.status(500).json({ error: 'internal_server_error' });
    }
  })();
});

module.exports = router;
