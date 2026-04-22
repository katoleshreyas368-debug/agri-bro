// ============================================================
// feeCalculator — Client-side fee calculation utility
//
// Mirrors the backend calculateFees() logic so the frontend
// can show a real-time fee preview WITHOUT hitting the server
// on every keystroke. The server is the source of truth when
// actually creating the Razorpay order.
// ============================================================

// ── Category Config (must stay in sync with backend) ────────
export const CATEGORY_CONFIG: Record<string, {
  gstRate: number;
  conveniencePct: number;
  label: string;
}> = {
  seeds:         { gstRate: 0.00, conveniencePct: 0.015, label: 'Seeds' },
  saplings:      { gstRate: 0.00, conveniencePct: 0.015, label: 'Saplings' },
  fresh_produce: { gstRate: 0.00, conveniencePct: 0.015, label: 'Fresh Produce' },
  fertilizers:   { gstRate: 0.00, conveniencePct: 0.015, label: 'Fertilizers' },
  pesticides:    { gstRate: 0.00, conveniencePct: 0.015, label: 'Pesticides' },

  equipment:     { gstRate: 0.12, conveniencePct: 0.010, label: 'Farm Equipment' },
  tools:         { gstRate: 0.12, conveniencePct: 0.010, label: 'Tools' },
  machinery:     { gstRate: 0.12, conveniencePct: 0.010, label: 'Machinery' },

  insurance:     { gstRate: 0.18, conveniencePct: 0.015, label: 'Crop Insurance' },

  advisory:      { gstRate: 0.18, conveniencePct: 0.020, label: 'Advisory Services' },
  subscription:  { gstRate: 0.18, conveniencePct: 0.020, label: 'Subscription' },
  saas:          { gstRate: 0.18, conveniencePct: 0.020, label: 'SaaS Plan' },
};

const DEFAULT_CONFIG = { gstRate: 0.00, conveniencePct: 0.015, label: 'General' };

// ── Constants ───────────────────────────────────────────────
const GST_ON_CONVENIENCE = 0.18;
const RAZORPAY_FEE_RATE  = 0.02;
const RAZORPAY_FEE_CAP   = 1500;
const GST_ON_RAZORPAY    = 0.18;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Types ───────────────────────────────────────────────────
export interface FeeBreakdown {
  baseAmount: number;
  productCategory: string;
  categoryLabel: string;
  productGSTRate: number;
  productGST: number;
  convenienceFeeRate: number;
  convenienceFee: number;
  convenienceFeeGSTRate: number;
  convenienceFeeGST: number;
  subtotal: number;
  razorpayFeeRate: number;
  razorpayFeeCap: number;
  razorpayFee: number;
  razorpayFeeGSTRate: number;
  razorpayFeeGST: number;
  razorpayTotalCost: number;
  totalPayable: number;
  amountInPaisa: number;
  merchantCost: number;
}

/**
 * calculateFees — Client-side fee calculation
 * (mirrors backend logic for instant preview)
 */
export function calculateFees(baseAmount: number, productCategory: string): FeeBreakdown {
  const categoryKey = (productCategory || '').toLowerCase().trim();
  const config = CATEGORY_CONFIG[categoryKey] || DEFAULT_CONFIG;

  const productGST       = round2(baseAmount * config.gstRate);
  const convenienceFee   = round2(baseAmount * config.conveniencePct);
  const convenienceFeeGST = round2(convenienceFee * GST_ON_CONVENIENCE);
  const subtotal         = round2(baseAmount + productGST + convenienceFee + convenienceFeeGST);

  const razorpayFeeRaw   = round2(subtotal * RAZORPAY_FEE_RATE);
  const razorpayFee      = round2(Math.min(razorpayFeeRaw, RAZORPAY_FEE_CAP));
  const razorpayFeeGST   = round2(razorpayFee * GST_ON_RAZORPAY);
  const razorpayTotalCost = round2(razorpayFee + razorpayFeeGST);

  const totalPayable = subtotal;
  const amountInPaisa = Math.round(totalPayable * 100);

  return {
    baseAmount:            round2(baseAmount),
    productCategory:       categoryKey || 'general',
    categoryLabel:         config.label,
    productGSTRate:        config.gstRate,
    productGST,
    convenienceFeeRate:    config.conveniencePct,
    convenienceFee,
    convenienceFeeGSTRate: GST_ON_CONVENIENCE,
    convenienceFeeGST,
    subtotal,
    razorpayFeeRate:       RAZORPAY_FEE_RATE,
    razorpayFeeCap:        RAZORPAY_FEE_CAP,
    razorpayFee,
    razorpayFeeGSTRate:    GST_ON_RAZORPAY,
    razorpayFeeGST,
    razorpayTotalCost,
    totalPayable,
    amountInPaisa,
    merchantCost:          razorpayTotalCost,
  };
}

/**
 * Format INR currency string
 */
export function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format percentage for display
 */
export function formatPct(rate: number): string {
  return (rate * 100).toFixed(1) + '%';
}
