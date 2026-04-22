import React, { useState, useMemo } from 'react';
import { X, ShoppingCart, Shield, CheckCircle, Clock, AlertCircle, Receipt, Info } from 'lucide-react';
import { useRazorpay } from '../hooks/useRazorpay';
import { calculateFees, formatINR, formatPct } from '../utils/feeCalculator';

interface TradePaymentModalProps {
  trade: {
    id: string;
    name: string;
    quantity: number;
    currentBid: number;
    farmerName: string;
    location: string;
  };
  onClose: () => void;
  onPaymentComplete: (orderId: string) => void;
  token: string;
  apiUrl: string;
}

const TradePaymentModal: React.FC<TradePaymentModalProps> = ({
  trade,
  onClose,
  onPaymentComplete,
  token,
  apiUrl
}) => {
  const { initiatePayment, isLoading } = useRazorpay();
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [orderId, setOrderId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // ── Crop trades are classified as 'fresh_produce' (0% GST, 1.5% platform fee) ──
  const feeCategory = 'fresh_produce';
  const baseAmount = trade.currentBid;

  // ── Calculate fee breakdown ──
  const breakdown = useMemo(() => {
    if (baseAmount <= 0) return null;
    return calculateFees(baseAmount, feeCategory);
  }, [baseAmount, feeCategory]);

  const totalPayable = breakdown?.totalPayable || baseAmount;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      // Pay the totalPayable (includes fees) through Razorpay
      const result = await initiatePayment({
        amount: totalPayable,
        currency: 'INR',
        receipt: `trade_${trade.id}`,
        description: `Payment for ${trade.name} - Trade Settlement`,
        notes: {
          cropId: trade.id,
          cropName: trade.name,
          quantity: trade.quantity.toString(),
          farmerName: trade.farmerName,
          feeCategory,
          baseAmount: baseAmount.toString(),
          totalPayable: totalPayable.toString(),
        },
      });

      if (result.success) {
        // Payment successful! Now confirm the trade on backend
        try {
          const confirmRes = await fetch(`${apiUrl}/crops/${trade.id}/confirm-trade`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              paymentStatus: 'completed',
              paymentAmount: totalPayable,
              paymentId: result.paymentId,
              razorpayPaymentId: result.paymentId,
              razorpayOrderId: result.orderId,
              // Send the full fee breakdown for storage
              feeBreakdown: breakdown,
            })
          });

          if (confirmRes.ok) {
            await confirmRes.json();
            setPaymentStatus('completed');
            setOrderId(result.paymentId || trade.id);

            // Auto-close after 3 seconds
            setTimeout(() => {
              onPaymentComplete(trade.id);
              onClose();
            }, 3000);
          } else {
            const errData = await confirmRes.json();
            throw new Error(errData.error || 'Failed to confirm trade');
          }
        } catch (confirmErr: any) {
          console.error('Trade confirmation error:', confirmErr);
          setErrorMessage(confirmErr.message);
          setPaymentStatus('failed');
        }
      } else {
        setErrorMessage(result.error || 'Payment failed');
        setPaymentStatus('failed');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred');
      setPaymentStatus('failed');
    }
  };

  // ── Success state ──
  if (paymentStatus === 'completed') {
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={48} className="text-green-600 animate-bounce" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-4">Your trade has been finalized and confirmed.</p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Order ID</span>
              <span className="text-sm font-bold text-gray-900">{orderId}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Base Amount</span>
              <span className="text-sm font-bold text-gray-900">{formatINR(baseAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Total Paid (incl. fees)</span>
              <span className="text-lg font-bold text-green-600">{formatINR(totalPayable)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            ✓ Farmer has been notified<br />
            ✓ Trade confirmed automatically
          </p>

          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Failed state ──
  if (paymentStatus === 'failed') {
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={48} className="text-red-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-600 mb-4">{errorMessage || 'Something went wrong during payment processing.'}</p>
          <p className="text-sm text-gray-500 mb-6">Please try again or contact support if the problem persists.</p>

          <button
            onClick={() => {
              setPaymentStatus('pending');
              setErrorMessage('');
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition mb-2"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="w-full border border-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Main payment form with Fee Breakdown ──
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <span className="text-xs font-bold text-brand-green uppercase tracking-widest">Trade Settlement</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-1">Complete Payment</h2>
        </div>

        {/* Trade Details Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 overflow-hidden mb-6">
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{trade.name}</h3>
              <p className="text-sm text-gray-600">Farmer: {trade.farmerName}</p>
              <p className="text-sm text-gray-600">Location: {trade.location}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-200">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Quantity</p>
                <p className="text-lg font-bold text-gray-900">{trade.quantity} kg</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Bid Amount</p>
                <p className="text-lg font-bold text-blue-600">{formatINR(baseAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Fee Breakdown ── */}
        {breakdown && (
          <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-3 border border-gray-200">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <Receipt size={14} className="text-brand-green" />
              <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest">Fee Breakdown</span>
              <span className="text-[10px] text-gray-400 ml-auto uppercase tracking-wider">{breakdown.categoryLabel}</span>
            </div>

            {/* Base Amount */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Bid Amount</span>
              <span className="font-bold text-gray-900">{formatINR(breakdown.baseAmount)}</span>
            </div>

            {/* Product GST */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Product GST ({formatPct(breakdown.productGSTRate)})</span>
              {breakdown.productGST === 0 ? (
                <span className="font-bold text-brand-green text-xs bg-brand-green/10 px-2 py-0.5 rounded-full">
                  Exempt ✓
                </span>
              ) : (
                <span className="font-bold text-gray-900">{formatINR(breakdown.productGST)}</span>
              )}
            </div>

            {/* Convenience Fee */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Platform Fee ({formatPct(breakdown.convenienceFeeRate)})</span>
              <span className="font-bold text-gray-900">{formatINR(breakdown.convenienceFee)}</span>
            </div>

            {/* GST on Convenience Fee */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 text-xs">GST on Platform Fee (18%)</span>
              <span className="text-gray-500 text-xs">{formatINR(breakdown.convenienceFeeGST)}</span>
            </div>

            <div className="h-px bg-gray-200 my-2" />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase">Total Payment</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{formatINR(breakdown.totalPayable)}</p>
              </div>
            </div>

            {/* GST exempt info */}
            {breakdown.productGST === 0 && (
              <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                <Info size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Agricultural produce is GST-exempt. Platform fee + 18% GST applies.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payment Processing Info */}
        {paymentStatus === 'processing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <div className="animate-spin">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">Processing Payment...</p>
              <p className="text-sm text-blue-700">Please wait while we confirm your payment</p>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <form onSubmit={handlePayment} className="space-y-4">
          <button
            type="submit"
            disabled={isLoading || paymentStatus === 'processing'}
            className="w-full bg-brand-green hover:bg-green-700 disabled:bg-gray-400 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            {isLoading || paymentStatus === 'processing' ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-r-transparent" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart size={20} />
                Pay {formatINR(totalPayable)}
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
            <Shield size={14} className="text-brand-green" />
            Secure Payment via Razorpay
          </p>
        </form>
      </div>
    </div>
  );
};

export default TradePaymentModal;
