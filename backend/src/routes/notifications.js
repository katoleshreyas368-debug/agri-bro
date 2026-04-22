const express = require('express');
const router = express.Router();
const { readDB, writeDB, mongoFindOne, mongoFind, mongoUpdateOne, mongoDeleteMany, isMongoEnabled } = require('../db');
const { requireAuth } = require('../middleware');

// GET /notifications - Get all notifications for the user
router.get('/', requireAuth, async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const notifications = await mongoFind('notifications', { userId: req.user.id });
      return res.json(notifications || []);
    }

    const db = await readDB();
    const notifications = (db.notifications || []).filter(n => n.userId === req.user.id);
    res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// GET /notifications/unread - Get count of unread notifications
router.get('/unread', requireAuth, async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const notifications = await mongoFind('notifications', {
        userId: req.user.id,
        read: false
      });
      return res.json({ unreadCount: notifications?.length || 0 });
    }

    const db = await readDB();
    const unreadCount = (db.notifications || []).filter(
      n => n.userId === req.user.id && !n.read
    ).length;
    res.json({ unreadCount });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// PUT /notifications/:id - Mark notification as read
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const notification = await mongoFindOne('notifications', { id: req.params.id });
      if (!notification) return res.status(404).json({ error: 'notification_not_found' });
      if (notification.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

      await mongoUpdateOne('notifications', { id: req.params.id }, { $set: { read: true, readAt: new Date().toISOString() } });
      
      return res.json({ success: true, message: 'Notification marked as read' });
    }

    const db = await readDB();
    const notification = (db.notifications || []).find(n => n.id === req.params.id);
    if (!notification) return res.status(404).json({ error: 'notification_not_found' });
    if (notification.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

    notification.read = true;
    notification.readAt = new Date().toISOString();
    await writeDB(db);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark notification as read error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// DELETE /notifications/:id - Delete a notification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const notification = await mongoFindOne('notifications', { id: req.params.id });
      if (!notification) return res.status(404).json({ error: 'notification_not_found' });
      if (notification.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

      await mongoDeleteMany('notifications', { id: req.params.id });
      return res.status(204).send();
    }

    const db = await readDB();
    const notificationIndex = (db.notifications || []).findIndex(n => n.id === req.params.id);
    if (notificationIndex === -1) return res.status(404).json({ error: 'notification_not_found' });
    if (db.notifications[notificationIndex].userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

    db.notifications.splice(notificationIndex, 1);
    await writeDB(db);
    res.status(204).send();

  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// INTERNAL: POST /notifications/create - Create a notification (called internally by other endpoints)
router.post('/internal/create', async (req, res) => {
  // This is an internal endpoint - not meant to be called from the client
  // It's used by other backend services to create notifications
  try {
    const { userId, type, title, message, data } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type, // 'bid_accepted', 'trade_confirmed', 'payment_received', etc.
      title,
      message,
      data: data || {},
      read: false,
      createdAt: new Date().toISOString()
    };

    if (await isMongoEnabled()) {
      await mongoUpdateOne('notifications', { id: notification.id }, { $set: notification }, { upsert: true });
    } else {
      const db = await readDB();
      if (!db.notifications) db.notifications = [];
      db.notifications.push(notification);
      await writeDB(db);
    }

    res.status(201).json(notification);
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

module.exports = router;
