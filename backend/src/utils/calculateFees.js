// ============================================================
// calculateFees — Reusable Fee Calculation Utility
//
// Computes a full breakdown of all charges for a given order:
//   1. Product GST (category-specific)
//   2. Convenience Fee + GST on it
//   3. Razorpay Payment Gateway Fee + GST on it
//   4. Final total in both ₹ and paise
//
// Agriculture-specific rates follow Indian GST norms where
// seeds, saplings, fresh produce, fertilizers, pesticides
// are EXEMPT (0% GST), while equipment is 12%, and
// insurance/advisory services are 18%.
// ============================================================

// ── Product Category Configuration ──────────────────────────
// Each category defines:
//   gstRate           → GST % applied on the base product price
//   conveniencePct    → Platform convenience fee % on order value
//
const CATEGORY_CONFIG = {
  // 0% GST — Agricultural essentials are exempt under GST
  seeds:        { gstRate: 0.00, conveniencePct: 0.015, label: 'Seeds' },
  saplings:     { gstRate: 0.00, conveniencePct: 0.015, label: 'Saplings' },
  fresh_produce:{ gstRate: 0.00, conveniencePct: 0.015, label: 'Fresh Produce' },
  fertilizers:  { gstRate: 0.00, conveniencePct: 0.015, label: 'Fertilizers' },
  pesticides:   { gstRate: 0.00, conveniencePct: 0.015, label: 'Pesticides' },

  // 12% GST — Farm equipment, tools, machinery
  equipment:    { gstRate: 0.12, conveniencePct: 0.010, label: 'Farm Equipment' },
  tools:        { gstRate: 0.12, conveniencePct: 0.010, label: 'Tools' },
  machinery:    { gstRate: 0.12, conveniencePct: 0.010, label: 'Machinery' },

  // 18% GST — Insurance premiums
  insurance:    { gstRate: 0.18, conveniencePct: 0.015, label: 'Crop Insurance' },

  // 18% GST — Advisory, subscriptions, SaaS plans
  advisory:     { gstRate: 0.18, conveniencePct: 0.020, label: 'Advisory Services' },
  subscription: { gstRate: 0.18, conveniencePct: 0.020, label: 'Subscription' },
  saas:         { gstRate: 0.18, conveniencePct: 0.020, label: 'SaaS Plan' },
};

// ── Constants ───────────────────────────────────────────────
const GST_ON_CONVENIENCE   = 0.18;   // 18% GST on convenience fee
const RAZORPAY_FEE_RATE    = 0.02;   // 2% Razorpay payment gateway fee
const RAZORPAY_FEE_CAP     = 1500;   // ₹1500 cap per transaction (Razorpay standard)
const GST_ON_RAZORPAY      = 0.18;   // 18% GST on Razorpay fee

// ── Default category fallback ───────────────────────────────
const DEFAULT_CONFIG = { gstRate: 0.00, conveniencePct: 0.015, label: 'General' };


/**
 * calculateFees — Computes the full fee breakdown for an order.
 *
 * @param {number} baseAmount      — Base product price in ₹ (NOT paise)
 * @param {string} productCategory — One of the keys in CATEGORY_CONFIG
 *
 * @returns {Object} Full breakdown:
 *   {
 *     baseAmount,            — Original price (₹)
 *     productCategory,       — Category key used
 *     categoryLabel,         — Human-readable category name
 *     productGSTRate,        — GST rate applied (e.g. 0.12 = 12%)
 *     productGST,            — GST amount (₹)
 *     convenienceFeeRate,    — Convenience fee rate (e.g. 0.015 = 1.5%)
 *     convenienceFee,        — Convenience fee amount (₹)
 *     convenienceFeeGSTRate, — GST rate on convenience fee (always 18%)
 *     convenienceFeeGST,     — GST on convenience fee (₹)
 *     subtotal,              — base + productGST + convenienceFee + convenienceFeeGST
 *     razorpayFeeRate,       — Razorpay fee rate (always 2%)
 *     razorpayFeeCap,        — Max Razorpay fee per txn (₹1500)
 *     razorpayFee,           — Razorpay fee amount (₹) — absorbed by merchant
 *     razorpayFeeGSTRate,    — GST rate on Razorpay fee (always 18%)
 *     razorpayFeeGST,        — GST on Razorpay fee (₹) — absorbed by merchant
 *     razorpayTotalCost,     — Total Razorpay cost (fee + GST) — merchant bears this
 *     totalPayable,          — Amount the customer pays (₹)
 *     amountInPaisa,         — totalPayable × 100, rounded — for Razorpay API
 *     merchantCost,          — Total fees absorbed by merchant (₹)
 *   }
 */
function calculateFees(baseAmount, productCategory) {
  // ── 1. Validate inputs ─────────────────────────────────────
  if (typeof baseAmount !== 'number' || isNaN(baseAmount) || baseAmount <= 0) {
    throw new Error(`Invalid baseAmount: ${baseAmount}. Must be a positive number.`);
  }

  // Normalise category key: lowercase + trim
  const categoryKey = (productCategory || '').toLowerCase().trim();
  const config = CATEGORY_CONFIG[categoryKey] || DEFAULT_CONFIG;

  // ── 2. Product GST ─────────────────────────────────────────
  // Applied on the base price. Agricultural essentials are 0%.
  const productGST = round2(baseAmount * config.gstRate);

  // ── 3. Convenience Fee (platform charge) ───────────────────
  // Calculated on the order value (baseAmount only, not GST).
  const convenienceFee = round2(baseAmount * config.conveniencePct);

  // ── 4. GST on Convenience Fee ──────────────────────────────
  // 18% GST is always applicable on the convenience fee.
  const convenienceFeeGST = round2(convenienceFee * GST_ON_CONVENIENCE);

  // ── 5. Subtotal (what the customer pays) ───────────────────
  // = base price + product GST + convenience fee + GST on convenience fee
  const subtotal = round2(baseAmount + productGST + convenienceFee + convenienceFeeGST);

  // ── 6. Razorpay Payment Gateway Fee ────────────────────────
  // 2% of subtotal, capped at ₹1500 per transaction.
  // NOTE: This fee is ABSORBED BY THE MERCHANT, not passed to customer.
  const razorpayFeeRaw = round2(subtotal * RAZORPAY_FEE_RATE);
  const razorpayFee = round2(Math.min(razorpayFeeRaw, RAZORPAY_FEE_CAP));

  // ── 7. GST on Razorpay Fee ─────────────────────────────────
  // 18% GST on the Razorpay fee — also merchant-absorbed.
  const razorpayFeeGST = round2(razorpayFee * GST_ON_RAZORPAY);

  // ── 8. Total Razorpay cost to merchant ─────────────────────
  const razorpayTotalCost = round2(razorpayFee + razorpayFeeGST);

  // ── 9. Final amount the customer pays ──────────────────────
  // The customer pays the subtotal. Razorpay fees are on the merchant.
  const totalPayable = subtotal;

  // ── 10. Convert to paise for Razorpay order creation ───────
  // Razorpay expects amount in the smallest currency unit (paise).
  const amountInPaisa = Math.round(totalPayable * 100);

  return {
    // Base
    baseAmount:            round2(baseAmount),
    productCategory:       categoryKey || 'general',
    categoryLabel:         config.label,

    // Product GST
    productGSTRate:        config.gstRate,
    productGST,

    // Convenience Fee
    convenienceFeeRate:    config.conveniencePct,
    convenienceFee,
    convenienceFeeGSTRate: GST_ON_CONVENIENCE,
    convenienceFeeGST,

    // Subtotal (customer-facing)
    subtotal,

    // Razorpay Fee (merchant-absorbed — clearly marked)
    razorpayFeeRate:       RAZORPAY_FEE_RATE,
    razorpayFeeCap:        RAZORPAY_FEE_CAP,
    razorpayFee,
    razorpayFeeGSTRate:    GST_ON_RAZORPAY,
    razorpayFeeGST,
    razorpayTotalCost,

    // Final amounts
    totalPayable,
    amountInPaisa,

    // Merchant cost summary
    merchantCost:          razorpayTotalCost,
  };
}


/**
 * round2 — Round to 2 decimal places (₹ precision)
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}


/**
 * getAvailableCategories — Returns all valid category keys and labels
 * (useful for dropdowns / validation on frontend)
 */
function getAvailableCategories() {
  return Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    gstRate: cfg.gstRate,
    conveniencePct: cfg.conveniencePct,
  }));
}


module.exports = {
  calculateFees,
  getAvailableCategories,
  CATEGORY_CONFIG,
};
