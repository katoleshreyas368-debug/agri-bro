// ============================================================
// Shipment Payment Routes — Buyer Freight Payment Flow
//
// Handles:
//   POST   /shipment-payment/create-order        — Razorpay order for freight
//   POST   /shipment-payment/verify              — Signature verification
//   POST   /shipment-payment/webhook             — Razorpay webhook events
//   POST   /shipment-payment/:id/refund          — Manual refund trigger
//   GET    /shipment-payment/:id/status           — Payment status lookup
//
// Status Flow:
//   PENDING → BUYER_PAYMENT_DONE → FARMER_NOTIFIED →
//   PICKED_UP → IN_TRANSIT → DELIVERED
//
// Edge cases:
//   • Duplicate order creation (idempotency key)
//   • Payment timeout before pickup
//   • Transporter cancellation after payment (auto-refund)
// ============================================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAuth } = require('../middleware');
const {
  makeId,
  isMongoEnabled,
  mongoInsertOne,
  mongoFindOne,
  mongoFind,
  mongoUpdateOne
} = require('../db');

// ── Razorpay SDK ────────────────────────────────────────────
const Razorpay = require('razorpay');

let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ── Notification helpers (reuse from logistics if available) ─
let sendSMS, sendEmail;
try {
  const twilio = require('twilio');
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
    const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    sendSMS = async (to, message) => {
      if (!to) return;
      try {
        await twilioClient.messages.create({ body: message, from: process.env.TWILIO_NUMBER, to });
      } catch (e) { console.error('SMS failed:', e.message); }
    };
  }
} catch (e) { /* twilio not installed */ }
if (!sendSMS) sendSMS = async () => {};

try {
  const nodemailer = require('nodemailer');
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const mailer = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    sendEmail = async (to, subject, text) => {
      if (!to) return;
      try {
        await mailer.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
      } catch (e) { console.error('Email failed:', e.message); }
    };
  }
} catch (e) { /* nodemailer not installed */ }
if (!sendEmail) sendEmail = async () => {};

// ── WebSocket broadcast ─────────────────────────────────────
function broadcast(req, shipmentId, event, data) {
  const io = req.app.get('io');
  if (io) io.to(shipmentId).emit(event, data);
}


// ── Shipment Fee Configuration ──────────────────────────────
const SHIPMENT_FEE_CONFIG = {
  // Base transportation rate per KG
  baseRatePerKg: 8,          // ₹8/kg

  // Distance-based surcharge tiers (estimated from location strings)
  distanceSurchargeRate: 0.05, // 5% surcharge for inter-city

  // Convenience fee (platform charge)
  convenienceFeeRate: 0.015,   // 1.5% of base freight
  convenienceFeeGSTRate: 0.18, // 18% GST on convenience fee

  // Platform insurance (goods protection)
  insuranceRate: 0.02,         // 2% of goods value (optional)

  // Razorpay gateway fee (merchant-absorbed, shown for transparency)
  gatewayFeeRate: 0.02,        // 2% gateway fee
  gatewayFeeGSTRate: 0.18,     // 18% GST on gateway fee
  gatewayFeeCap: 1500,         // ₹1500 max cap
};

/**
 * calculateShipmentFees — Compute full fee breakdown for a shipment
 */
function calculateShipmentFees({ weightKg, goodsType, fromLocation, toLocation }) {
  const cfg = SHIPMENT_FEE_CONFIG;
  const weight = Number(weightKg) || 0;

  // ── 1. Base transportation charge ──
  const baseFreight = round2(weight * cfg.baseRatePerKg);

  // ── 2. Distance surcharge (inter-city detection) ──
  const from = (fromLocation || '').toLowerCase();
  const to = (toLocation || '').toLowerCase();
  const isSameCity = from && to && (from.includes(to.split(',')[0]?.trim()) || to.includes(from.split(',')[0]?.trim()));
  const distanceSurcharge = isSameCity ? 0 : round2(baseFreight * cfg.distanceSurchargeRate);

  // ── 3. Loading/unloading charges (flat based on weight) ──
  let loadingCharges = 0;
  if (weight > 500) loadingCharges = 200;
  else if (weight > 100) loadingCharges = 100;
  else if (weight > 0) loadingCharges = 50;

  // ── 4. Subtotal before fees ──
  const transportSubtotal = round2(baseFreight + distanceSurcharge + loadingCharges);

  // ── 5. Convenience fee (platform charge) ──
  const convenienceFee = round2(transportSubtotal * cfg.convenienceFeeRate);
  const convenienceFeeGST = round2(convenienceFee * cfg.convenienceFeeGSTRate);

  // ── 6. Insurance (goods protection) ──
  const insurance = round2(transportSubtotal * cfg.insuranceRate);

  // ── 7. Total payable by buyer ──
  const totalPayable = round2(transportSubtotal + convenienceFee + convenienceFeeGST + insurance);
  const amountInPaise = Math.round(totalPayable * 100);

  // ── 8. Gateway fee (merchant side — shown for transparency) ──
  const gatewayFeeRaw = round2(totalPayable * cfg.gatewayFeeRate);
  const gatewayFee = round2(Math.min(gatewayFeeRaw, cfg.gatewayFeeCap));
  const gatewayFeeGST = round2(gatewayFee * cfg.gatewayFeeGSTRate);

  return {
    // Line items
    baseFreight,
    ratePerKg: cfg.baseRatePerKg,
    weightKg: weight,
    distanceSurcharge,
    loadingCharges,
    transportSubtotal,

    // Fees
    convenienceFee,
    convenienceFeeRate: cfg.convenienceFeeRate,
    convenienceFeeGST,
    convenienceFeeGSTRate: cfg.convenienceFeeGSTRate,
    insurance,
    insuranceRate: cfg.insuranceRate,

    // Customer total
    totalPayable,
    amountInPaise,

    // Gateway (merchant only — shown for transparency)
    gatewayFee,
    gatewayFeeRate: cfg.gatewayFeeRate,
    gatewayFeeGST,
    merchantCost: round2(gatewayFee + gatewayFeeGST),

    // Metadata
    goodsType: goodsType || 'general',
    fromLocation: fromLocation || '',
    toLocation: toLocation || '',
    isSameCity,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}


// ─────────────────────────────────────────────────────────────
// POST /shipment-payment/calculate-fees
//
// Frontend calls this BEFORE payment to show the full breakdown.
// ─────────────────────────────────────────────────────────────
router.post('/calculate-fees', requireAuth, async (req, res) => {
  try {
    const { weightKg, goodsType, fromLocation, toLocation } = req.body;

    if (!weightKg || Number(weightKg) <= 0) {
      return res.status(400).json({ success: false, error: 'invalid_weight' });
    }

    const fees = calculateShipmentFees({ weightKg, goodsType, fromLocation, toLocation });

    return res.json({ success: true, fees });
  } catch (err) {
    console.error('Calculate fees error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /shipment-payment/create-order
//
// Buyer confirms a shipment → creates Razorpay order for freight.
//
// Body: {
//   shipmentId, freightAmount, buyerName, buyerPhone,
//   farmerId, farmerName, transporterId, transporterName,
//   pickupLocation, dropLocation, goodsType, weightKg
// }
//
// EDGE CASE: Idempotency — if a Razorpay order already exists
// for this shipmentId in 'created' status, return the existing
// order instead of creating a duplicate.
// ─────────────────────────────────────────────────────────────
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({
        success: false,
        error: 'payment_not_configured',
        message: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
      });
    }

    const {
      shipmentId,
      freightAmount,
      buyerName,
      buyerPhone,
      farmerId,
      farmerName,
      transporterId,
      transporterName,
      pickupLocation,
      dropLocation,
      goodsType,
      weightKg
    } = req.body;

    // ── Validation ──
    if (!shipmentId) {
      return res.status(400).json({ success: false, error: 'missing_shipment_id' });
    }
    if (!freightAmount || isNaN(freightAmount) || Number(freightAmount) <= 0) {
      return res.status(400).json({ success: false, error: 'invalid_freight_amount' });
    }

    const amount = Number(freightAmount);
    const amountInPaise = Math.round(amount * 100);

    // ── EDGE CASE: Duplicate order guard ──
    // If buyer clicks "Confirm" twice, return the existing order
    if (await isMongoEnabled()) {
      const existingOrder = await mongoFindOne('shipment_payments', {
        shipmentId,
        status: 'created'
      });
      if (existingOrder) {
        console.log(`⚡ Returning existing order for shipment ${shipmentId} (dedup)`);
        return res.status(200).json({
          success: true,
          deduplicated: true,
          order: {
            id: existingOrder.razorpayOrderId,
            amount: existingOrder.amountInPaise,
            currency: existingOrder.currency,
          },
          dbOrder: existingOrder,
        });
      }
    }

    // ── Create Razorpay order with shipment metadata in notes ──
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `freight_${shipmentId}_${Date.now()}`,
      notes: {
        shipmentId,
        buyerId: req.user.id,
        buyerName: buyerName || req.user.name || '',
        farmerId: farmerId || '',
        farmerName: farmerName || '',
        transporterId: transporterId || '',
        transporterName: transporterName || '',
        pickupLocation: pickupLocation || '',
        dropLocation: dropLocation || '',
        goodsType: goodsType || '',
        weightKg: String(weightKg || ''),
        paymentType: 'shipment_freight',
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

    // ── Store in DB ──
    const dbOrder = {
      id: makeId(),
      razorpayOrderId: razorpayOrder.id,
      shipmentId,
      buyerId: req.user.id,
      buyerName: buyerName || req.user.name,
      buyerPhone: buyerPhone || '',
      farmerId: farmerId || '',
      farmerName: farmerName || '',
      transporterId: transporterId || '',
      transporterName: transporterName || '',
      pickupLocation: pickupLocation || '',
      dropLocation: dropLocation || '',
      goodsType: goodsType || '',
      weightKg: Number(weightKg) || 0,
      freightAmount: amount,
      amountInPaise,
      currency: 'INR',
      receipt: orderOptions.receipt,
      status: 'created',   // created → paid → failed → refunded
      shipmentStatus: 'PENDING',
      refundStatus: null,
      refundId: null,
      refundAmount: null,
      createdAt: new Date().toISOString(),
    };

    if (await isMongoEnabled()) {
      await mongoInsertOne('shipment_payments', dbOrder);
    }

    console.log(`✅ Shipment freight order created: ${razorpayOrder.id} for shipment ${shipmentId}`);

    return res.status(201).json({
      success: true,
      order: razorpayOrder,
      dbOrder,
    });
  } catch (err) {
    console.error('Shipment payment create-order error:', err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: 'razorpay_error',
        message: err.error?.description || 'Razorpay API error.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: err.message,
    });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /shipment-payment/verify
//
// After buyer completes Razorpay checkout, verify the signature
// and update:
//   1. shipment_payments collection → status: 'paid'
//   2. logistics collection → shipmentStatus: 'BUYER_PAYMENT_DONE'
//   3. Notify farmer that payment is confirmed & pickup can proceed
// ─────────────────────────────────────────────────────────────
router.post('/verify', requireAuth, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ success: false, error: 'payment_not_configured' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, shipmentId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
      });
    }

    // ── Signature verification using Razorpay's HMAC SHA256 ──
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      console.warn(`⚠️  Shipment payment verification FAILED: ${razorpay_order_id}`);

      if (await isMongoEnabled()) {
        await mongoUpdateOne(
          'shipment_payments',
          { razorpayOrderId: razorpay_order_id },
          { $set: { status: 'signature_failed', verifiedAt: new Date().toISOString() } }
        );
      }
      return res.status(400).json({ success: false, error: 'invalid_signature' });
    }

    // ── Signature valid — update payment record ──
    console.log(`✅ Shipment payment VERIFIED: ${razorpay_order_id}`);

    if (await isMongoEnabled()) {
      // 1. Update payment record
      await mongoUpdateOne(
        'shipment_payments',
        { razorpayOrderId: razorpay_order_id },
        {
          $set: {
            status: 'paid',
            shipmentStatus: 'BUYER_PAYMENT_DONE',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            paidAt: new Date().toISOString(),
            verifiedAt: new Date().toISOString(),
          }
        }
      );

      // 2. Fetch the payment record to get shipment details
      const paymentRecord = await mongoFindOne('shipment_payments', { razorpayOrderId: razorpay_order_id });
      const sid = shipmentId || paymentRecord?.shipmentId;

      if (sid) {
        // 3. Update the logistics record with payment status
        await mongoUpdateOne(
          'logistics',
          { id: sid },
          {
            $set: {
              paymentStatus: 'BUYER_PAYMENT_DONE',
              paymentId: razorpay_payment_id,
              paymentOrderId: razorpay_order_id,
              paymentVerifiedAt: new Date().toISOString(),
            },
            $push: {
              statusHistory: {
                status: 'BUYER_PAYMENT_DONE',
                actor: paymentRecord?.buyerName || 'buyer',
                note: `Freight payment of ₹${paymentRecord?.freightAmount || 0} confirmed via Razorpay`,
                timestamp: new Date().toISOString(),
              }
            }
          }
        );

        // 4. Notify farmer: payment confirmed, pickup can proceed
        const shipment = (await mongoFind('logistics', { id: sid }))?.[0];
        if (shipment) {
          const farmerMsg = `🎉 AGRIBro: Payment of ₹${paymentRecord?.freightAmount} received for shipment ${shipment.trackingId || sid}! Please prepare for pickup.`;
          sendSMS(shipment.farmerPhone, farmerMsg).catch(() => {});
          sendEmail(shipment.buyerEmail, 'Payment Confirmed — Pickup Ready', farmerMsg).catch(() => {});

          // 5. Move to FARMER_NOTIFIED status
          await mongoUpdateOne(
            'shipment_payments',
            { razorpayOrderId: razorpay_order_id },
            { $set: { shipmentStatus: 'FARMER_NOTIFIED' } }
          );
          await mongoUpdateOne(
            'logistics',
            { id: sid },
            {
              $set: { paymentStatus: 'FARMER_NOTIFIED' },
              $push: {
                statusHistory: {
                  status: 'FARMER_NOTIFIED',
                  actor: 'system',
                  note: 'Farmer notified — awaiting pickup',
                  timestamp: new Date().toISOString(),
                }
              }
            }
          );

          // Broadcast via WebSocket
          broadcast(req, sid, 'payment_update', {
            shipmentId: sid,
            paymentStatus: 'BUYER_PAYMENT_DONE',
            paymentId: razorpay_payment_id,
          });
        }
      }

      return res.json({
        success: true,
        message: 'Payment verified. Farmer notified for pickup.',
        payment: paymentRecord,
      });
    }

    // Non-Mongo fallback
    return res.json({
      success: true,
      message: 'Payment verified successfully.',
      payment: { razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, status: 'paid' },
    });
  } catch (err) {
    console.error('Shipment payment verify error:', err);
    return res.status(500).json({ success: false, error: 'internal_server_error', message: err.message });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /shipment-payment/webhook
//
// Razorpay server-to-server webhook. NO auth middleware because
// Razorpay sends this directly. Verified using webhook secret.
//
// Events handled:
//   • payment.captured  → Mark paid, notify farmer
//   • payment.failed    → Alert buyer, keep PENDING
//   • refund.processed  → Update refund status in DB
// ─────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // ── Verify webhook signature (if secret is configured) ──
    if (webhookSecret) {
      const receivedSignature = req.headers['x-razorpay-signature'];
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
        .digest('hex');

      if (receivedSignature !== expectedSignature) {
        console.warn('⚠️  Webhook signature mismatch — rejecting');
        return res.status(400).json({ error: 'invalid_webhook_signature' });
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload.event;
    const entity = payload.payload?.payment?.entity || {};
    const orderId = entity.order_id;
    const paymentId = entity.id;

    console.log(`📩 Webhook received: ${event} | Order: ${orderId} | Payment: ${paymentId}`);

    if (!(await isMongoEnabled())) {
      // Without Mongo we can only ack
      return res.json({ status: 'ok', message: 'Webhook received (no DB)' });
    }

    // ── EVENT: payment.captured ──
    if (event === 'payment.captured') {
      const paymentRecord = await mongoFindOne('shipment_payments', { razorpayOrderId: orderId });

      if (paymentRecord && paymentRecord.status !== 'paid') {
        await mongoUpdateOne(
          'shipment_payments',
          { razorpayOrderId: orderId },
          {
            $set: {
              status: 'paid',
              shipmentStatus: 'BUYER_PAYMENT_DONE',
              razorpayPaymentId: paymentId,
              paidAt: new Date().toISOString(),
            }
          }
        );

        // Update logistics record
        if (paymentRecord.shipmentId) {
          await mongoUpdateOne(
            'logistics',
            { id: paymentRecord.shipmentId },
            {
              $set: { paymentStatus: 'BUYER_PAYMENT_DONE', paymentId },
              $push: {
                statusHistory: {
                  status: 'BUYER_PAYMENT_DONE',
                  actor: 'razorpay_webhook',
                  note: `Payment captured: ₹${entity.amount / 100}`,
                  timestamp: new Date().toISOString(),
                }
              }
            }
          );

          // Notify farmer
          const shipment = (await mongoFind('logistics', { id: paymentRecord.shipmentId }))?.[0];
          if (shipment) {
            const msg = `🎉 AGRIBro: Freight payment captured for ${shipment.trackingId}. Prepare for pickup!`;
            sendSMS(shipment.farmerPhone, msg).catch(() => {});
            sendEmail(shipment.buyerEmail, 'Payment Captured', msg).catch(() => {});
          }
        }
      }

      return res.json({ status: 'ok', event: 'payment.captured' });
    }

    // ── EVENT: payment.failed ──
    if (event === 'payment.failed') {
      const paymentRecord = await mongoFindOne('shipment_payments', { razorpayOrderId: orderId });

      if (paymentRecord) {
        await mongoUpdateOne(
          'shipment_payments',
          { razorpayOrderId: orderId },
          {
            $set: {
              status: 'failed',
              failureReason: entity.error_description || 'Payment failed',
              failedAt: new Date().toISOString(),
            }
          }
        );

        // Alert buyer via email
        if (paymentRecord.buyerPhone || paymentRecord.shipmentId) {
          const shipment = paymentRecord.shipmentId
            ? (await mongoFind('logistics', { id: paymentRecord.shipmentId }))?.[0]
            : null;

          const msg = `⚠️ AGRIBro: Your freight payment for ${shipment?.trackingId || paymentRecord.shipmentId} failed. Please try again.`;
          sendSMS(paymentRecord.buyerPhone, msg).catch(() => {});
          if (shipment?.buyerEmail) {
            sendEmail(shipment.buyerEmail, 'Payment Failed — Please Retry', msg).catch(() => {});
          }
        }
      }

      return res.json({ status: 'ok', event: 'payment.failed' });
    }

    // ── EVENT: refund.processed ──
    if (event === 'refund.processed' || event === 'refund.created') {
      const refundEntity = payload.payload?.refund?.entity || {};
      const refundPaymentId = refundEntity.payment_id;
      const refundAmount = refundEntity.amount ? refundEntity.amount / 100 : 0;
      const refundId = refundEntity.id;

      // Find payment by razorpayPaymentId
      const paymentRecord = await mongoFindOne('shipment_payments', { razorpayPaymentId: refundPaymentId });

      if (paymentRecord) {
        await mongoUpdateOne(
          'shipment_payments',
          { razorpayPaymentId: refundPaymentId },
          {
            $set: {
              refundStatus: 'processed',
              refundId,
              refundAmount,
              refundedAt: new Date().toISOString(),
            }
          }
        );

        // Update logistics
        if (paymentRecord.shipmentId) {
          await mongoUpdateOne(
            'logistics',
            { id: paymentRecord.shipmentId },
            {
              $set: { paymentStatus: 'REFUNDED' },
              $push: {
                statusHistory: {
                  status: 'REFUNDED',
                  actor: 'razorpay_webhook',
                  note: `Refund of ₹${refundAmount} processed (${refundId})`,
                  timestamp: new Date().toISOString(),
                }
              }
            }
          );
        }

        console.log(`💰 Refund processed: ${refundId} — ₹${refundAmount}`);
      }

      return res.json({ status: 'ok', event });
    }

    // Unhandled event
    console.log(`ℹ️  Unhandled webhook event: ${event}`);
    return res.json({ status: 'ok', event: 'unhandled' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Always return 200 to Razorpay to prevent retries
    return res.status(200).json({ status: 'error', message: err.message });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /shipment-payment/:shipmentId/refund
//
// EDGE CASE: Transporter cancels after buyer has paid.
// Auto-refund the full freight amount back to buyer.
//
// Body: { reason? }
// ─────────────────────────────────────────────────────────────
router.post('/:shipmentId/refund', requireAuth, async (req, res) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({ success: false, error: 'payment_not_configured' });
    }

    const { shipmentId } = req.params;
    const { reason } = req.body;

    if (!(await isMongoEnabled())) {
      return res.status(503).json({ success: false, error: 'mongo_required' });
    }

    // Find the paid payment for this shipment
    const paymentRecord = await mongoFindOne('shipment_payments', {
      shipmentId,
      status: 'paid'
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        error: 'no_paid_payment',
        message: 'No paid payment found for this shipment.',
      });
    }

    if (paymentRecord.refundStatus === 'processed') {
      return res.status(400).json({
        success: false,
        error: 'already_refunded',
        message: 'This payment has already been refunded.',
      });
    }

    // ── Initiate Razorpay refund ──
    const refund = await razorpayInstance.payments.refund(paymentRecord.razorpayPaymentId, {
      amount: paymentRecord.amountInPaise, // Full refund
      notes: {
        shipmentId,
        reason: reason || 'Transporter cancellation',
        refundedBy: req.user.name || req.user.id,
      },
    });

    // ── Update DB ──
    await mongoUpdateOne(
      'shipment_payments',
      { shipmentId, status: 'paid' },
      {
        $set: {
          status: 'refunded',
          refundStatus: 'initiated',
          refundId: refund.id,
          refundAmount: paymentRecord.freightAmount,
          refundReason: reason || 'Transporter cancellation',
          refundedAt: new Date().toISOString(),
        }
      }
    );

    // Update logistics status
    await mongoUpdateOne(
      'logistics',
      { id: shipmentId },
      {
        $set: {
          paymentStatus: 'REFUND_INITIATED',
          status: 'cancelled',
        },
        $push: {
          statusHistory: {
            status: 'REFUND_INITIATED',
            actor: req.user.name || 'system',
            note: `Auto-refund of ₹${paymentRecord.freightAmount} initiated. Reason: ${reason || 'Transporter cancellation'}`,
            timestamp: new Date().toISOString(),
          }
        }
      }
    );

    // Notify buyer about refund
    const shipment = (await mongoFind('logistics', { id: shipmentId }))?.[0];
    if (shipment) {
      const msg = `AGRIBro: Your freight payment of ₹${paymentRecord.freightAmount} for shipment ${shipment.trackingId || shipmentId} is being refunded. Reason: ${reason || 'Transporter cancellation'}`;
      sendSMS(paymentRecord.buyerPhone, msg).catch(() => {});
      sendEmail(shipment.buyerEmail, 'Refund Initiated', msg).catch(() => {});
    }

    console.log(`💰 Refund initiated for shipment ${shipmentId}: ${refund.id}`);

    return res.json({
      success: true,
      message: 'Refund initiated successfully.',
      refund: {
        id: refund.id,
        amount: paymentRecord.freightAmount,
        status: 'initiated',
      },
    });
  } catch (err) {
    console.error('Refund error:', err);
    return res.status(500).json({
      success: false,
      error: 'refund_failed',
      message: err.error?.description || err.message || 'Failed to initiate refund.',
    });
  }
});


// ─────────────────────────────────────────────────────────────
// GET /shipment-payment/:shipmentId/status
//
// Fetch full payment + shipment status for the buyer's UI.
// ─────────────────────────────────────────────────────────────
router.get('/:shipmentId/status', requireAuth, async (req, res) => {
  try {
    const { shipmentId } = req.params;

    if (await isMongoEnabled()) {
      const payment = await mongoFindOne('shipment_payments', { shipmentId });
      if (!payment) {
        return res.json({ success: true, payment: null, message: 'No payment found for this shipment.' });
      }
      return res.json({ success: true, payment });
    }

    return res.json({ success: true, payment: null });
  } catch (err) {
    console.error('Payment status error:', err);
    return res.status(500).json({ success: false, error: 'internal_server_error' });
  }
});


module.exports = router;
