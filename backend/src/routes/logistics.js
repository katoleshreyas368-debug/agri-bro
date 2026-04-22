const express = require('express');
const router = express.Router();
const {
  readDB,
  writeDB,
  makeId,
  isMongoEnabled,
  mongoFind,
  mongoInsertOne,
  mongoUpdateOne
} = require('../db');
const { requireAuth } = require('../middleware');

// ─── NEW: WebSocket broadcast helper ─────────────────────────────────────────
// Sends a real-time event to every client watching a specific shipment.
// Uses the io instance stored on the Express app (set in index.js).
function broadcast(req, shipmentId, event, data) {
  const io = req.app.get('io');
  if (io) io.to(shipmentId).emit(event, data);
}

// ─── NEW: External service imports (graceful if not installed) ────────────────
let twilioClient = null;
let geminiModel = null;
let mailer = null;

try {
  const twilio = require('twilio');
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  }
} catch (e) { /* twilio not installed — SMS disabled */ }

try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  if (process.env.GOOGLE_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    console.log('✅ Gemini AI route suggestions enabled (FREE)');
  }
} catch (e) { /* @google/generative-ai not installed — AI route disabled */ }

try {
  const nodemailer = require('nodemailer');
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    mailer = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }
} catch (e) { /* nodemailer not installed — email disabled */ }

// ─── Notification helpers (silent fail if not configured) ────────────────────
async function sendSMS(to, message) {
  if (!to || !twilioClient) return;
  try {
    await twilioClient.messages.create({
      body: message, from: process.env.TWILIO_NUMBER, to
    });
    console.log(`SMS sent to ${to}`);
  } catch (e) { console.error('SMS failed:', e.message); }
}

async function sendEmail(to, subject, text) {
  if (!to || !mailer) return;
  try {
    await mailer.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
    console.log(`Email sent to ${to}`);
  } catch (e) { console.error('Email failed:', e.message); }
}

// ─── AI helper: route suggestion + estimated delivery (Google Gemini — FREE) ─
async function getAIRouteSuggestion(cropType, quantity, fromLocation, toLocation) {
  if (!geminiModel) return { aiRoute: 'Route optimization unavailable', estimatedDelivery: null };
  try {
    const prompt = `You are a logistics expert for Indian agriculture. For shipping ${quantity}kg of ${cropType} from ${fromLocation} to ${toLocation} in India:
1. Suggest the best transport route in 1 short sentence.
2. Estimate delivery time in hours.
Reply ONLY in this JSON format, no extra text: {"route":"your route suggestion","estimatedHours":number}`;

    const result = await geminiModel.generateContent(prompt);
    const raw = result.response.text().trim();

    // Extract JSON from response (Gemini may wrap in markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          aiRoute: parsed.route || raw,
          estimatedDelivery: parsed.estimatedHours ? `${parsed.estimatedHours} hours` : null
        };
      } catch {
        return { aiRoute: raw.replace(/```json|```/g, '').trim(), estimatedDelivery: null };
      }
    }
    return { aiRoute: raw.replace(/```json|```/g, '').trim(), estimatedDelivery: null };
  } catch (e) {
    console.error('AI route suggestion failed:', e.message);
    return { aiRoute: 'Route optimization unavailable', estimatedDelivery: null };
  }
}

// ─── Helper: push a status event to the audit log ────────────────────────────
function makeStatusEvent(status, actor = 'system', note = '') {
  return { status, actor, note, timestamp: new Date().toISOString() };
}

/* =====================================================
   GET ALL LOGISTICS REQUESTS
===================================================== */
router.get('/', async (req, res) => {
  try {
    if (await isMongoEnabled()) {
      const list = await mongoFind('logistics', {});
      return res.json(list || []);
    }

    const db = await readDB();
    res.json(db.logistics || []);
  } catch (err) {
    console.error('Fetch logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   GET MY LOGISTICS REQUESTS (filtered by logged-in user)
===================================================== */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const type = req.user.type;

    if (await isMongoEnabled()) {
      let query = {};
      if (type === 'farmer') {
        query = { farmerId: userId };
      } else if (type === 'buyer') {
        query = { $or: [{ buyerId: userId }, { buyerEmail: req.user.email }] };
      } else if (type === 'vendor') {
        query = { farmerId: userId }; // vendors create requests with their own id as farmerId
      } else if (type === 'transporter') {
        // Show assigned jobs + unassigned pending ones
        query = { $or: [{ transporterId: userId }, { status: 'pending', transporterId: null }] };
      }
      const list = await mongoFind('logistics', query);
      return res.json(list || []);
    }

    const db = await readDB();
    let filtered = db.logistics || [];
    if (type === 'farmer') {
      filtered = filtered.filter(r => r.farmerId === userId);
    } else if (type === 'buyer') {
      filtered = filtered.filter(r => r.buyerId === userId || r.buyerEmail === req.user.email);
    } else if (type === 'vendor') {
      filtered = filtered.filter(r => r.farmerId === userId);
    } else if (type === 'transporter') {
      filtered = filtered.filter(r => r.transporterId === userId || (r.status === 'pending' && !r.transporterId));
    }
    res.json(filtered);
  } catch (err) {
    console.error('Fetch my logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   CREATE NEW REQUEST (Farmer)
   ✅ Enhanced: trackingId, AI route, notifications, audit log
===================================================== */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { cropType, quantity, fromLocation, toLocation, requestedDate,
      farmerPhone, buyerEmail } = req.body;

    if (!cropType || !quantity || !fromLocation || !toLocation) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    // Generate tracking ID
    const trackingId = 'TRK' + Date.now();

    // AI route suggestion + estimated delivery
    const { aiRoute, estimatedDelivery } = await getAIRouteSuggestion(
      cropType, quantity, fromLocation, toLocation
    );

    const newReq = {
      id: makeId(),
      trackingId,
      farmerId: req.user.id,
      farmerName: req.user.name,
      farmerPhone: farmerPhone || null,
      buyerEmail: buyerEmail || null,
      cropType,
      quantity: Number(quantity),
      fromLocation,
      toLocation,
      requestedDate: requestedDate || new Date().toISOString(),
      status: 'pending',
      transporterId: null,
      transporterName: null,
      progress: 0,
      aiRoute,
      estimatedDelivery,
      review: null,                     // Enhancement: review placeholder
      statusHistory: [                  // Enhancement: audit log
        makeStatusEvent('pending', req.user.name, 'Shipment created')
      ],
      createdAt: new Date().toISOString()
    };

    if (await isMongoEnabled()) {
      await mongoInsertOne('logistics', newReq);
    } else {
      const db = await readDB();
      db.logistics = db.logistics || [];
      db.logistics.unshift(newReq);
      await writeDB(db);
    }

    // Send notifications (non-blocking, failures won't crash the request)
    sendSMS(farmerPhone,
      `AGRIBro: Shipment created! ID: ${trackingId}. ${fromLocation} → ${toLocation}`
    ).catch(() => { });
    sendEmail(buyerEmail,
      'Your AGRIBro order is confirmed',
      `Tracking ID: ${trackingId}\nCrop: ${cropType} (${quantity}kg)\nRoute: ${fromLocation} → ${toLocation}\nAI Suggestion: ${aiRoute}${estimatedDelivery ? `\nEstimated delivery: ${estimatedDelivery}` : ''}`
    ).catch(() => { });

    res.status(201).json(newReq);

    // NEW: broadcast new shipment creation
    broadcast(req, newReq.id, 'shipment_update', newReq);
  } catch (err) {
    console.error('Create logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   ACCEPT REQUEST (Transporter)
   Status: accepted
   ✅ Enhanced: notifications + audit log
===================================================== */
router.patch('/:id/accept', requireAuth, async (req, res) => {
  try {
    console.log(`[Accept Job] User ID: ${req.user.id}, Type: ${req.user.type}`);
    if (req.user.type !== 'transporter') {
      console.log('[Accept Job] Failed: User is not a transporter');
      return res.status(403).json({ error: 'only_transporters_allowed', currentType: req.user.type });
    }

    const { id } = req.params;
    const statusEvent = makeStatusEvent('accepted', req.user.name, 'Transporter accepted the job');

    if (await isMongoEnabled()) {
      await mongoUpdateOne(
        'logistics',
        { id },
        {
          $set: {
            status: 'accepted',
            transporterId: req.user.id,
            transporterName: req.user.name
          },
          $push: { statusHistory: statusEvent }
        }
      );

      // Notify farmer & buyer
      const item = (await mongoFind('logistics', { id }))?.[0];
      if (item) {
        const msg = `AGRIBro: Your shipment ${item.trackingId} has been accepted by ${req.user.name}.`;
        sendSMS(item.farmerPhone, msg).catch(() => { });
        sendEmail(item.buyerEmail, 'Shipment accepted', msg).catch(() => { });
      }
      // NEW: broadcast accept via WebSocket (Mongo path)
      broadcast(req, id, 'shipment_update', {
        id,
        status: 'accepted',
        transporterId: req.user.id,
        transporterName: req.user.name
      });

      return res.json({ success: true });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'not_found' });
    }

    db.logistics[reqIndex].status = 'accepted';
    db.logistics[reqIndex].transporterId = req.user.id;
    db.logistics[reqIndex].transporterName = req.user.name;
    db.logistics[reqIndex].statusHistory = db.logistics[reqIndex].statusHistory || [];
    db.logistics[reqIndex].statusHistory.push(statusEvent);

    // Notify
    const item = db.logistics[reqIndex];
    const msg = `AGRIBro: Your shipment ${item.trackingId} has been accepted by ${req.user.name}.`;
    sendSMS(item.farmerPhone, msg).catch(() => { });
    sendEmail(item.buyerEmail, 'Shipment accepted', msg).catch(() => { });

    await writeDB(db);

    // NEW: broadcast accept via WebSocket
    broadcast(req, id, 'shipment_update', {
      id,
      status: 'accepted',
      transporterId: req.user.id,
      transporterName: req.user.name
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Accept logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   START DELIVERY (Transporter)
   Status: in-transit
   ✅ Enhanced: notifications + audit log
===================================================== */
router.patch('/:id/start', requireAuth, async (req, res) => {
  try {
    if (req.user.type !== 'transporter') {
      return res.status(403).json({ error: 'only_transporters_allowed' });
    }

    const { id } = req.params;
    const statusEvent = makeStatusEvent('in-transit', req.user.name, 'Delivery started');

    if (await isMongoEnabled()) {
      await mongoUpdateOne(
        'logistics',
        { id },
        {
          $set: {
            status: 'in-transit',
            progress: 0
          },
          $push: { statusHistory: statusEvent }
        }
      );

      const item = (await mongoFind('logistics', { id }))?.[0];
      if (item) {
        const msg = `AGRIBro: Your shipment ${item.trackingId} is now in transit! 🚛`;
        sendSMS(item.farmerPhone, msg).catch(() => { });
        sendEmail(item.buyerEmail, 'Shipment in transit', msg).catch(() => { });
      }

      // NEW: broadcast start via WebSocket (Mongo path)
      broadcast(req, id, 'shipment_update', {
        id,
        status: 'in-transit',
        progress: 0
      });

      return res.json({ success: true });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'not_found' });
    }

    db.logistics[reqIndex].status = 'in-transit';
    db.logistics[reqIndex].progress = 0;
    db.logistics[reqIndex].statusHistory = db.logistics[reqIndex].statusHistory || [];
    db.logistics[reqIndex].statusHistory.push(statusEvent);

    const item = db.logistics[reqIndex];
    const msg = `AGRIBro: Your shipment ${item.trackingId} is now in transit! 🚛`;
    sendSMS(item.farmerPhone, msg).catch(() => { });
    sendEmail(item.buyerEmail, 'Shipment in transit', msg).catch(() => { });

    await writeDB(db);

    // NEW: broadcast start via WebSocket
    broadcast(req, id, 'shipment_update', {
      id,
      status: 'in-transit',
      progress: 0
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Start logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   UPDATE GPS PROGRESS
   ✅ Enhanced: milestone notifications at 25/50/75/100%
===================================================== */
router.patch('/:id/progress', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'invalid_progress' });
    }

    const notifyAt = [25, 50, 75, 100];

    if (await isMongoEnabled()) {
      const updateSet = { progress };
      if (progress === 100) updateSet.status = 'completed';

      await mongoUpdateOne(
        'logistics',
        { id },
        { $set: updateSet }
      );

      // Milestone notifications
      if (notifyAt.includes(progress)) {
        const item = (await mongoFind('logistics', { id }))?.[0];
        if (item) {
          const msg = `AGRIBro: Your shipment ${item.trackingId || id} is ${progress}% complete.${progress === 100 ? ' ✅ Delivered!' : ''}`;
          sendSMS(item.farmerPhone, msg).catch(() => { });
          sendEmail(item.buyerEmail, `Shipment update: ${progress}% delivered`, msg).catch(() => { });
        }
      }
      // NEW: broadcast progress via WebSocket
      broadcast(req, id, 'progress_update', {
        id,
        progress,
        status: progress === 100 ? 'completed' : 'in-transit'
      });

      return res.json({ success: true });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'not_found' });
    }

    db.logistics[reqIndex].progress = progress;

    if (progress === 100) {
      db.logistics[reqIndex].status = 'completed';
    }

    // Milestone notifications
    if (notifyAt.includes(progress)) {
      const item = db.logistics[reqIndex];
      const msg = `AGRIBro: Your shipment ${item.trackingId || id} is ${progress}% complete.${progress === 100 ? ' ✅ Delivered!' : ''}`;
      sendSMS(item.farmerPhone, msg).catch(() => { });
      sendEmail(item.buyerEmail, `Shipment update: ${progress}% delivered`, msg).catch(() => { });
    }

    await writeDB(db);

    // NEW: broadcast progress via WebSocket
    broadcast(req, id, 'progress_update', {
      id,
      progress,
      status: progress === 100 ? 'completed' : 'in-transit'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Update progress error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   COMPLETE DELIVERY
   ✅ Enhanced: notifications + audit log
===================================================== */
router.patch('/:id/complete', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const statusEvent = makeStatusEvent('completed', req.user?.name || 'system', 'Delivery completed');

    if (await isMongoEnabled()) {
      await mongoUpdateOne(
        'logistics',
        { id },
        {
          $set: {
            status: 'completed',
            progress: 100,
            completedAt: new Date().toISOString()
          },
          $push: { statusHistory: statusEvent }
        }
      );

      const item = (await mongoFind('logistics', { id }))?.[0];
      if (item) {
        const msg = `AGRIBro: Your shipment ${item.trackingId} has been delivered! ✅`;
        sendSMS(item.farmerPhone, msg).catch(() => { });
        sendEmail(item.buyerEmail, 'Delivery completed! ✅', msg).catch(() => { });
      }
      // NEW: broadcast completion via WebSocket
      broadcast(req, id, 'shipment_update', {
        id,
        status: 'completed',
        progress: 100
      });

      return res.json({ success: true });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ error: 'not_found' });
    }

    db.logistics[reqIndex].status = 'completed';
    db.logistics[reqIndex].progress = 100;
    db.logistics[reqIndex].completedAt = new Date().toISOString();
    db.logistics[reqIndex].statusHistory = db.logistics[reqIndex].statusHistory || [];
    db.logistics[reqIndex].statusHistory.push(statusEvent);

    const item = db.logistics[reqIndex];
    const msg = `AGRIBro: Your shipment ${item.trackingId} has been delivered! ✅`;
    sendSMS(item.farmerPhone, msg).catch(() => { });
    sendEmail(item.buyerEmail, 'Delivery completed! ✅', msg).catch(() => { });

    await writeDB(db);

    // NEW: broadcast completion via WebSocket
    broadcast(req, id, 'shipment_update', {
      id,
      status: 'completed',
      progress: 100
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Complete logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   🆕 CANCEL SHIPMENT (Farmer or Transporter)
   ✅ Enhanced: Transporter cancellation triggers auto-refund
   if buyer has already paid freight.
===================================================== */
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const cancelActor = req.user.type === 'transporter' ? 'transporter' : 'farmer';
    const statusEvent = makeStatusEvent('cancelled', req.user.name, reason || `Cancelled by ${cancelActor}`);

    if (await isMongoEnabled()) {
      const items = await mongoFind('logistics', { id });
      const item = items?.[0];
      if (!item) return res.status(404).json({ error: 'not_found' });

      // Allow farmer (owner) or assigned transporter to cancel
      const isFarmer = item.farmerId === req.user.id;
      const isTransporter = item.transporterId === req.user.id && req.user.type === 'transporter';
      if (!isFarmer && !isTransporter) {
        return res.status(403).json({ error: 'not_authorized_to_cancel' });
      }

      // Farmer can only cancel pending; transporter can cancel accepted/in-transit too
      if (isFarmer && item.status !== 'pending') {
        return res.status(400).json({ error: 'only_pending_can_cancel' });
      }

      await mongoUpdateOne(
        'logistics',
        { id },
        {
          $set: { status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: cancelActor },
          $push: { statusHistory: statusEvent }
        }
      );

      // ── EDGE CASE: Auto-refund if buyer has already paid ──
      let refundTriggered = false;
      if (item.paymentStatus === 'BUYER_PAYMENT_DONE' || item.paymentStatus === 'FARMER_NOTIFIED') {
        try {
          // Find the paid shipment payment record
          const paidPayment = await require('../db').mongoFindOne('shipment_payments', {
            shipmentId: id,
            status: 'paid'
          });

          if (paidPayment && paidPayment.razorpayPaymentId) {
            const Razorpay = require('razorpay');
            if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
              const rzp = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
              });

              const refund = await rzp.payments.refund(paidPayment.razorpayPaymentId, {
                amount: paidPayment.amountInPaise,
                notes: { shipmentId: id, reason: reason || `${cancelActor} cancellation`, autoRefund: 'true' },
              });

              await mongoUpdateOne(
                'shipment_payments',
                { shipmentId: id, status: 'paid' },
                {
                  $set: {
                    status: 'refunded',
                    refundStatus: 'initiated',
                    refundId: refund.id,
                    refundAmount: paidPayment.freightAmount,
                    refundReason: reason || `${cancelActor} cancellation`,
                    refundedAt: new Date().toISOString(),
                  }
                }
              );

              await mongoUpdateOne(
                'logistics',
                { id },
                {
                  $set: { paymentStatus: 'REFUND_INITIATED' },
                  $push: {
                    statusHistory: makeStatusEvent(
                      'REFUND_INITIATED',
                      'system',
                      `Auto-refund of ₹${paidPayment.freightAmount} initiated due to ${cancelActor} cancellation`
                    )
                  }
                }
              );

              refundTriggered = true;
              console.log(`💰 Auto-refund initiated for shipment ${id}: ${refund.id}`);
            }
          }
        } catch (refundErr) {
          console.error('Auto-refund failed:', refundErr.message);
          // Don't block cancellation if refund fails — it can be retried manually
        }
      }

      sendSMS(item.farmerPhone, `AGRIBro: Shipment ${item.trackingId} has been cancelled by ${cancelActor}.${refundTriggered ? ' Buyer refund initiated.' : ''}`).catch(() => { });
      sendEmail(item.buyerEmail, 'Shipment cancelled', `Shipment ${item.trackingId} was cancelled.\nReason: ${reason || 'N/A'}${refundTriggered ? '\nYour freight payment refund has been initiated.' : ''}`).catch(() => { });
      broadcast(req, id, 'shipment_update', {
        id,
        status: 'cancelled',
        refundTriggered,
      });

      return res.json({ success: true, refundTriggered });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);
    if (reqIndex === -1) return res.status(404).json({ error: 'not_found' });

    const item = db.logistics[reqIndex];
    if (item.farmerId !== req.user.id) return res.status(403).json({ error: 'not_your_shipment' });
    if (item.status !== 'pending') return res.status(400).json({ error: 'only_pending_can_cancel' });

    db.logistics[reqIndex].status = 'cancelled';
    db.logistics[reqIndex].cancelledAt = new Date().toISOString();
    db.logistics[reqIndex].statusHistory = db.logistics[reqIndex].statusHistory || [];
    db.logistics[reqIndex].statusHistory.push(statusEvent);

    sendSMS(item.farmerPhone, `AGRIBro: Shipment ${item.trackingId} has been cancelled.`).catch(() => { });
    sendEmail(item.buyerEmail, 'Shipment cancelled', `Shipment ${item.trackingId} was cancelled.\nReason: ${reason || 'N/A'}`).catch(() => { });

    await writeDB(db);

    broadcast(req, id, 'shipment_update', {
      id,
      status: 'cancelled'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Cancel logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   🆕 RATE/REVIEW COMPLETED DELIVERY (Farmer)
===================================================== */
router.post('/:id/review', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating_must_be_1_to_5' });
    }

    const review = {
      rating: Number(rating),
      comment: comment || '',
      reviewedBy: req.user.name,
      reviewedAt: new Date().toISOString()
    };

    if (await isMongoEnabled()) {
      const items = await mongoFind('logistics', { id });
      const item = items?.[0];
      if (!item) return res.status(404).json({ error: 'not_found' });
      if (item.status !== 'completed') return res.status(400).json({ error: 'only_completed_can_review' });
      if (item.farmerId !== req.user.id) return res.status(403).json({ error: 'only_farmer_can_review' });

      await mongoUpdateOne('logistics', { id }, { $set: { review } });
      return res.json({ success: true, review });
    }

    const db = await readDB();
    const reqIndex = db.logistics.findIndex(r => r.id === id);
    if (reqIndex === -1) return res.status(404).json({ error: 'not_found' });

    const item = db.logistics[reqIndex];
    if (item.status !== 'completed') return res.status(400).json({ error: 'only_completed_can_review' });
    if (item.farmerId !== req.user.id) return res.status(403).json({ error: 'only_farmer_can_review' });

    db.logistics[reqIndex].review = review;
    await writeDB(db);

    res.json({ success: true, review });
  } catch (err) {
    console.error('Review logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   🆕 PUBLIC TRACKING BY TRACKING ID (No auth needed)
===================================================== */
router.get('/track/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;

    if (await isMongoEnabled()) {
      const items = await mongoFind('logistics', { trackingId });
      if (!items?.length) return res.status(404).json({ error: 'not_found' });

      // Return safe public view (no internal IDs)
      const item = items[0];
      return res.json({
        trackingId: item.trackingId,
        cropType: item.cropType,
        quantity: item.quantity,
        fromLocation: item.fromLocation,
        toLocation: item.toLocation,
        status: item.status,
        progress: item.progress,
        aiRoute: item.aiRoute,
        estimatedDelivery: item.estimatedDelivery,
        transporterName: item.transporterName,
        requestedDate: item.requestedDate,
        createdAt: item.createdAt,
        completedAt: item.completedAt || null,
        statusHistory: item.statusHistory || [],
        review: item.review || null
      });
    }

    const db = await readDB();
    const item = (db.logistics || []).find(r => r.trackingId === trackingId);
    if (!item) return res.status(404).json({ error: 'not_found' });

    res.json({
      trackingId: item.trackingId,
      cropType: item.cropType,
      quantity: item.quantity,
      fromLocation: item.fromLocation,
      toLocation: item.toLocation,
      status: item.status,
      progress: item.progress,
      aiRoute: item.aiRoute,
      estimatedDelivery: item.estimatedDelivery,
      transporterName: item.transporterName,
      requestedDate: item.requestedDate,
      createdAt: item.createdAt,
      completedAt: item.completedAt || null,
      statusHistory: item.statusHistory || [],
      review: item.review || null
    });
  } catch (err) {
    console.error('Track logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/* =====================================================
   🆕 GET SHIPMENT AUDIT LOG / STATUS HISTORY
===================================================== */
router.get('/:id/history', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (await isMongoEnabled()) {
      const items = await mongoFind('logistics', { id });
      if (!items?.length) return res.status(404).json({ error: 'not_found' });
      return res.json({ statusHistory: items[0].statusHistory || [] });
    }

    const db = await readDB();
    const item = (db.logistics || []).find(r => r.id === id);
    if (!item) return res.status(404).json({ error: 'not_found' });

    res.json({ statusHistory: item.statusHistory || [] });
  } catch (err) {
    console.error('History logistics error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

module.exports = router;
