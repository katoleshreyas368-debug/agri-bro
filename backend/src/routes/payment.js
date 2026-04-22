// ============================================================
// Razorpay Payment Routes — With Full Fee Calculation
//
// Handles:
//   • Fee breakdown preview (GET /payment/fee-breakdown)
//   • Fee-aware order creation (POST /payment/create-order-with-fees)
//   • Legacy order creation (POST /payment/create-order)
//   • Payment verification with fee storage (POST /payment/verify)
//   • Order status lookup (GET /payment/status/:orderId)
//   • Available categories list (GET /payment/categories)
// ============================================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAuth } = require('../middleware');
const { makeId, isMongoEnabled, mongoInsertOne, mongoFindOne, mongoUpdateOne } = require('../db');
const { calculateFees, getAvailableCategories } = require('../utils/calculateFees');

// ── Razorpay SDK setup ──────────────────────────────────────
const Razorpay = require('razorpay');

let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('✅ Razorpay payment gateway enabled');
} else {
  console.log('⚠️  Razorpay keys missing — payment routes will return 503');
}


// ─────────────────────────────────────────────────────────────
// GET /payment/categories
// Returns all valid product categories with their fee config.
// Useful for frontend dropdowns and validation.
// ─────────────────────────────────────────────────────────────
router.get('/categories', (req, res) => {
  return res.json({
    success: true,
    categories: getAvailableCategories(),
  });
});


// ─────────────────────────────────────────────────────────────
// GET /payment/fee-breakdown?amount=1000&category=seeds
// Returns a preview of all fees WITHOUT creating a Razorpay order.
// Use this for the <FeeBreakdown /> component on the frontend.
//
// Query Params:
//   amount   — Base amount in ₹
//   category — Product category key (e.g., 'seeds', 'equipment')
// ─────────────────────────────────────────────────────────────
router.get('/fee-breakdown', (req, res) => {
  try {
    const { amount, category } = req.query;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_amount',
        message: 'Query param "amount" must be a positive number (in ₹).',
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'missing_category',
        message: 'Query param "category" is required.',
      });
    }

    const breakdown = calculateFees(Number(amount), category);

    return res.json({
      success: true,
      breakdown,
    });
  } catch (err) {
    console.error('Fee breakdown error:', err);
    return res.status(400).json({
      success: false,
      error: 'calculation_error',
      message: err.message,
    });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /payment/create-order-with-fees
// Creates a Razorpay order with full fee calculation.
//
// Body: { amount, productCategory, productId?, currency?, notes? }
// Returns: { success, order, feeBreakdown, dbOrder }
// ─────────────────────────────────────────────────────────────
router.post('/create-order-with-fees', requireAuth, async (req, res) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({
        success: false,
        error: 'payment_not_configured',
        message: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
      });
    }

    const { amount, productCategory, productId, currency = 'INR', notes = {} } = req.body;

    // ── Validate amount ──
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_amount',
        message: 'Amount must be a positive number (in ₹).',
      });
    }

    // ── Validate category ──
    if (!productCategory) {
      return res.status(400).json({
        success: false,
        error: 'missing_category',
        message: 'productCategory is required (e.g., "seeds", "equipment", "advisory").',
      });
    }

    // ── Calculate all fees ──
    const feeBreakdown = calculateFees(Number(amount), productCategory);

    // ── Create Razorpay order with the totalPayable amount ──
    // amountInPaisa already includes base + GST + convenience fee + GST on convenience
    const orderOptions = {
      amount: feeBreakdown.amountInPaisa,
      currency,
      receipt: `rcpt_${makeId()}`,
      notes: {
        userId: req.user.id,
        userName: req.user.name,
        productCategory: feeBreakdown.productCategory,
        productId: productId || '',
        baseAmount: feeBreakdown.baseAmount.toString(),
        totalPayable: feeBreakdown.totalPayable.toString(),
        ...notes,
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

    // ── Store order with full fee breakdown in DB ──
    const dbOrder = {
      id: makeId(),
      razorpayOrderId: razorpayOrder.id,
      userId: req.user.id,
      userName: req.user.name,
      productId: productId || null,
      productCategory: feeBreakdown.productCategory,
      categoryLabel: feeBreakdown.categoryLabel,

      // Fee breakdown (stored for auditing)
      baseAmount: feeBreakdown.baseAmount,
      productGSTRate: feeBreakdown.productGSTRate,
      productGST: feeBreakdown.productGST,
      convenienceFeeRate: feeBreakdown.convenienceFeeRate,
      convenienceFee: feeBreakdown.convenienceFee,
      convenienceFeeGSTRate: feeBreakdown.convenienceFeeGSTRate,
      convenienceFeeGST: feeBreakdown.convenienceFeeGST,
      subtotal: feeBreakdown.subtotal,
      razorpayFeeRate: feeBreakdown.razorpayFeeRate,
      razorpayFee: feeBreakdown.razorpayFee,
      razorpayFeeGST: feeBreakdown.razorpayFeeGST,
      razorpayTotalCost: feeBreakdown.razorpayTotalCost,
      totalPayable: feeBreakdown.totalPayable,
      amountInPaisa: feeBreakdown.amountInPaisa,
      merchantCost: feeBreakdown.merchantCost,

      currency,
      receipt: orderOptions.receipt,
      status: 'created',   // created → paid → failed
      notes,
      createdAt: new Date().toISOString(),
    };

    if (await isMongoEnabled()) {
      await mongoInsertOne('payments', dbOrder);
    }

    return res.status(201).json({
      success: true,
      order: razorpayOrder,
      feeBreakdown,
      dbOrder,
    });
  } catch (err) {
    console.error('Razorpay create-order-with-fees error:', err);

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
      message: err.message || 'Failed to create payment order.',
    });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /payment/create-order  (Legacy — No Fee Calculation)
// Kept for backward compatibility with existing TradePaymentModal.
//
// Body: { amount (in ₹), currency?, receipt?, notes? }
// Returns: { success, order, dbOrder }
// ─────────────────────────────────────────────────────────────
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({ success: false, error: 'payment_not_configured', message: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env' });
    }
    const { amount, currency = 'INR', receipt, notes = {} } = req.body;

    // ── Validation ──
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_amount',
        message: 'Amount must be a positive number (in ₹).',
      });
    }

    // Razorpay expects amount in paise
    const amountInPaise = Math.round(Number(amount) * 100);

    const orderOptions = {
      amount: amountInPaise,
      currency,
      receipt: receipt || `rcpt_${makeId()}`,
      notes: {
        userId: req.user.id,
        userName: req.user.name,
        ...notes,
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

    const dbOrder = {
      id: makeId(),
      razorpayOrderId: razorpayOrder.id,
      userId: req.user.id,
      userName: req.user.name,
      amount: Number(amount),
      amountInPaise,
      currency,
      receipt: orderOptions.receipt,
      status: 'created',
      notes,
      createdAt: new Date().toISOString(),
    };

    if (await isMongoEnabled()) {
      await mongoInsertOne('payments', dbOrder);
    }

    return res.status(201).json({
      success: true,
      order: razorpayOrder,
      dbOrder,
    });
  } catch (err) {
    console.error('Razorpay create-order error:', err);

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
      message: 'Failed to create payment order.',
    });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /payment/verify
// Verifies Razorpay signature and stores full fee breakdown
// in the final order record.
//
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Returns: { success, message, payment }
// ─────────────────────────────────────────────────────────────
router.post('/verify', requireAuth, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ success: false, error: 'payment_not_configured', message: 'Razorpay is not configured.' });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // ── Validation ──
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
      });
    }

    // ── Signature verification ──
    // Razorpay generates a signature using HMAC SHA256 with key_secret.
    // We recreate the same signature and compare to verify authenticity.
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      // ── Signature mismatch — potential tampering ──
      console.warn(`⚠️  Payment verification FAILED for order ${razorpay_order_id}`);

      if (await isMongoEnabled()) {
        await mongoUpdateOne(
          'payments',
          { razorpayOrderId: razorpay_order_id },
          {
            $set: {
              status: 'signature_failed',
              razorpayPaymentId: razorpay_payment_id,
              verifiedAt: new Date().toISOString(),
            },
          }
        );
      }

      return res.status(400).json({
        success: false,
        error: 'invalid_signature',
        message: 'Payment verification failed. Signature mismatch.',
      });
    }

    // ── Signature valid — mark payment as paid ──
    console.log(`✅ Payment VERIFIED for order ${razorpay_order_id}, payment ${razorpay_payment_id}`);

    if (await isMongoEnabled()) {
      await mongoUpdateOne(
        'payments',
        { razorpayOrderId: razorpay_order_id },
        {
          $set: {
            status: 'paid',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            paidAt: new Date().toISOString(),
            verifiedAt: new Date().toISOString(),
          },
        }
      );
    }

    // Fetch the updated payment record (includes full fee breakdown)
    let paymentRecord = null;
    if (await isMongoEnabled()) {
      paymentRecord = await mongoFindOne('payments', { razorpayOrderId: razorpay_order_id });
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully.',
      payment: paymentRecord || {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        status: 'paid',
      },
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Failed to verify payment.',
    });
  }
});


// ─────────────────────────────────────────────────────────────
// GET /payment/status/:orderId
// Fetches payment status for a given Razorpay order ID.
// Returns the full fee breakdown if available.
// ─────────────────────────────────────────────────────────────
router.get('/status/:orderId', requireAuth, async (req, res) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({ success: false, error: 'payment_not_configured', message: 'Razorpay is not configured.' });
    }
    const { orderId } = req.params;

    if (await isMongoEnabled()) {
      const payment = await mongoFindOne('payments', { razorpayOrderId: orderId });
      if (payment) {
        return res.json({ success: true, payment });
      }
    }

    // Fallback: fetch directly from Razorpay API
    try {
      const order = await razorpayInstance.orders.fetch(orderId);
      return res.json({ success: true, payment: order });
    } catch (fetchErr) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Payment order not found.',
      });
    }
  } catch (err) {
    console.error('Payment status error:', err);
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Failed to fetch payment status.',
    });
  }
});


module.exports = router;
