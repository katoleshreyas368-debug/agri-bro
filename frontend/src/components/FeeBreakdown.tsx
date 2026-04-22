// ============================================================
// FeeBreakdown — Visual Receipt of All Charges Before Payment
//
// Shows a clean, line-item breakdown of:
//   • Base product price
//   • Product GST (with rate %)
//   • Convenience fee + GST on it
//   • Subtotal (what user pays)
//   • Razorpay fee (merchant-absorbed, shown for transparency)
//   • Final total payable
//
// Usage:
//   <FeeBreakdown amount={5000} category="seeds" />
//   <FeeBreakdown amount={15000} category="equipment" onReady={(b) => ...} />
// ============================================================

import React, { useMemo } from 'react';
import {
  Receipt, ShieldCheck, Info, Leaf, Wrench,
  Shield, BookOpen, ChevronDown
} from 'lucide-react';
import {
  calculateFees,
  formatINR,
  formatPct,
  CATEGORY_CONFIG,
  type FeeBreakdown as FeeBreakdownType,
} from '../utils/feeCalculator';

// ── Props ───────────────────────────────────────────────────
interface FeeBreakdownProps {
  amount: number;                                // Base amount in ₹
  category: string;                              // Product category key
  showMerchantFees?: boolean;                    // Show Razorpay (merchant) fees
  compact?: boolean;                             // Compact mode (less padding)
  onReady?: (breakdown: FeeBreakdownType) => void; // Called when breakdown is ready
}

// ── Category icon helper ────────────────────────────────────
function getCategoryIcon(category: string) {
  const key = category.toLowerCase();
  if (['seeds', 'saplings', 'fresh_produce', 'fertilizers', 'pesticides'].includes(key)) {
    return <Leaf size={16} className="text-green-500" />;
  }
  if (['equipment', 'tools', 'machinery'].includes(key)) {
    return <Wrench size={16} className="text-orange-500" />;
  }
  if (key === 'insurance') {
    return <Shield size={16} className="text-blue-500" />;
  }
  return <BookOpen size={16} className="text-purple-500" />;
}

// ── Component ───────────────────────────────────────────────
const FeeBreakdown: React.FC<FeeBreakdownProps> = ({
  amount,
  category,
  showMerchantFees = false,
  compact = false,
  onReady,
}) => {
  // Calculate fees using the client-side utility
  const breakdown = useMemo(() => {
    if (!amount || amount <= 0) return null;
    const b = calculateFees(amount, category);
    onReady?.(b);
    return b;
  }, [amount, category, onReady]);

  if (!breakdown) {
    return (
      <div style={styles.emptyState}>
        <Info size={18} style={{ color: '#94a3b8' }} />
        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Enter an amount to see the fee breakdown
        </span>
      </div>
    );
  }

  const pad = compact ? '16px' : '24px';

  return (
    <div style={{ ...styles.container, padding: pad }} id="fee-breakdown-receipt">
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconCircle}>
            <Receipt size={18} style={{ color: '#2e7d32' }} />
          </div>
          <div>
            <h3 style={styles.title}>Fee Breakdown</h3>
            <div style={styles.categoryBadge}>
              {getCategoryIcon(breakdown.productCategory)}
              <span>{breakdown.categoryLabel}</span>
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <ShieldCheck size={14} style={{ color: '#2e7d32' }} />
          <span style={styles.secureText}>Transparent Pricing</span>
        </div>
      </div>

      {/* ── Line Items ── */}
      <div style={styles.lineItems}>
        {/* Base Amount */}
        <LineItem
          label="Base Product Price"
          value={formatINR(breakdown.baseAmount)}
          bold
        />

        {/* Product GST */}
        <LineItem
          label={`Product GST (${formatPct(breakdown.productGSTRate)})`}
          value={breakdown.productGST === 0 ? 'Exempt ✓' : formatINR(breakdown.productGST)}
          tag={breakdown.productGST === 0 ? 'exempt' : undefined}
          info={breakdown.productGST === 0
            ? 'Agricultural essentials are GST-exempt under Indian tax law'
            : `GST @ ${formatPct(breakdown.productGSTRate)} on base price`
          }
        />

        <Divider />

        {/* Convenience Fee */}
        <LineItem
          label={`Platform Convenience Fee (${formatPct(breakdown.convenienceFeeRate)})`}
          value={formatINR(breakdown.convenienceFee)}
          sublabel={`${formatPct(breakdown.convenienceFeeRate)} of ₹${breakdown.baseAmount.toLocaleString('en-IN')}`}
        />

        {/* GST on Convenience Fee */}
        <LineItem
          label="GST on Convenience Fee (18%)"
          value={formatINR(breakdown.convenienceFeeGST)}
          subtle
        />
      </div>

      {/* ── Total Payable ── */}
      <div style={styles.totalSection}>
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Total Payable</span>
          <span style={styles.totalValue}>{formatINR(breakdown.totalPayable)}</span>
        </div>
        <div style={styles.totalSubtext}>
          Charged to your payment method
        </div>
      </div>

      {/* ── Merchant Fees (collapsed by default) ── */}
      {showMerchantFees && (
        <MerchantFeesSection breakdown={breakdown} />
      )}

      {/* ── Footer Info ── */}
      <div style={styles.footer}>
        <Info size={13} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} />
        <span style={styles.footerText}>
          Payment gateway fees ({formatPct(breakdown.razorpayFeeRate)}, max {formatINR(breakdown.razorpayFeeCap)})
          are absorbed by the platform. You only pay {formatINR(breakdown.totalPayable)}.
        </span>
      </div>
    </div>
  );
};

// ── Line Item Sub-component ─────────────────────────────────
interface LineItemProps {
  label: string;
  value: string;
  sublabel?: string;
  bold?: boolean;
  subtle?: boolean;
  tag?: 'exempt';
  info?: string;
}

const LineItem: React.FC<LineItemProps> = ({ label, value, sublabel, bold, subtle, tag, info }) => (
  <div style={styles.lineItem}>
    <div style={{ flex: 1 }}>
      <div style={{
        ...styles.lineLabel,
        fontWeight: bold ? 600 : 400,
        color: subtle ? '#94a3b8' : '#475569',
      }}>
        {label}
        {info && (
          <span
            style={styles.infoIcon}
            title={info}
          >
            ⓘ
          </span>
        )}
      </div>
      {sublabel && <div style={styles.sublabel}>{sublabel}</div>}
    </div>
    <div style={{
      ...styles.lineValue,
      fontWeight: bold ? 700 : 500,
      color: subtle ? '#94a3b8' : '#1e293b',
    }}>
      {tag === 'exempt' ? (
        <span style={styles.exemptBadge}>{value}</span>
      ) : value}
    </div>
  </div>
);

// ── Divider ─────────────────────────────────────────────────
const Divider: React.FC = () => <div style={styles.divider} />;

// ── Merchant Fees Section ───────────────────────────────────
const MerchantFeesSection: React.FC<{ breakdown: FeeBreakdownType }> = ({ breakdown }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div style={styles.merchantSection}>
      <button
        style={styles.merchantToggle}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>Merchant-absorbed fees</span>
        <ChevronDown
          size={16}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
      {open && (
        <div style={styles.merchantDetails}>
          <LineItem
            label={`Razorpay Fee (${formatPct(breakdown.razorpayFeeRate)})`}
            value={formatINR(breakdown.razorpayFee)}
            subtle
          />
          <LineItem
            label="GST on Razorpay Fee (18%)"
            value={formatINR(breakdown.razorpayFeeGST)}
            subtle
          />
          <div style={{ ...styles.divider, margin: '8px 0' }} />
          <LineItem
            label="Total Merchant Cost"
            value={formatINR(breakdown.merchantCost)}
            bold
          />
        </div>
      )}
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, #fafffe 0%, #f0fdf4 100%)',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
    fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
    width: '100%',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #cbd5e1',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1.3,
  },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#64748b',
    marginTop: '2px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    flexShrink: 0,
  },
  secureText: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#2e7d32',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  lineItems: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  lineItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },
  lineLabel: {
    fontSize: '0.85rem',
    color: '#475569',
    lineHeight: 1.4,
  },
  sublabel: {
    fontSize: '0.72rem',
    color: '#94a3b8',
    marginTop: '1px',
  },
  lineValue: {
    fontSize: '0.85rem',
    color: '#1e293b',
    fontWeight: 500,
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
  },
  exemptBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '6px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  infoIcon: {
    marginLeft: '4px',
    fontSize: '0.7rem',
    color: '#94a3b8',
    cursor: 'help',
    verticalAlign: 'super',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(to right, transparent, #e2e8f0, transparent)',
    margin: '6px 0',
  },
  totalSection: {
    marginTop: '16px',
    padding: '16px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
    color: '#fff',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    opacity: 0.9,
  },
  totalValue: {
    fontSize: '1.5rem',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  totalSubtext: {
    fontSize: '0.72rem',
    opacity: 0.7,
    marginTop: '4px',
  },
  merchantSection: {
    marginTop: '12px',
    borderRadius: '10px',
    background: '#fef9ee',
    border: '1px solid #fde68a',
    overflow: 'hidden',
  },
  merchantToggle: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#92400e',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  merchantDetails: {
    padding: '0 14px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  footer: {
    display: 'flex',
    gap: '8px',
    marginTop: '14px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '0.72rem',
    color: '#64748b',
    lineHeight: 1.5,
  },
};

export default FeeBreakdown;
