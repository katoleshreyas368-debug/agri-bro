import React, { useState, useMemo } from 'react';
import { X, CheckCircle, AlertCircle, Loader, Receipt, Info } from 'lucide-react';
import { calculateFees, formatINR, formatPct } from '../utils/feeCalculator';

interface Crop {
  id: string;
  name: string;
  quantity: number;
  basePrice: number;
  acceptedBidId?: string;
  acceptedBuyerId?: string;
  acceptedAmount?: number;
  acceptedAt?: string;
  bids: any[];
  tradeStatus?: string;
}

interface TradeConfirmationModalProps {
  crop: Crop;
  onClose: () => void;
  onTradeConfirmed: (updatedCrop: Crop) => void;
  token: string;
  apiUrl: string;
}

const TradeConfirmationModal: React.FC<TradeConfirmationModalProps> = ({
  crop,
  onClose,
  onTradeConfirmed,
  token,
  apiUrl
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const acceptedBid = crop.bids.find(bid => bid.id === crop.acceptedBidId);

  // ── Calculate fees for the accepted amount ──
  // Crops are classified as 'fresh_produce' → 0% GST, 1.5% platform fee
  const breakdown = useMemo(() => {
    const amount = crop.acceptedAmount;
    if (!amount || amount <= 0) return null;
    return calculateFees(amount, 'fresh_produce');
  }, [crop.acceptedAmount]);

  const handleConfirmTrade = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiUrl}/crops/${crop.id}/confirm-trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        setAccepted(true);
        setTimeout(() => {
          onTradeConfirmed(data.crop);
        }, 2000);
      } else {
        setError(data.error || 'Failed to confirm trade');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (accepted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2002] p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Trade Confirmed!</h2>
          <p className="text-gray-600">
            Your trade has been successfully confirmed. The buyer will be notified shortly.
          </p>
          {breakdown && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-left">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Buyer will pay</span>
                <span className="font-bold text-green-700">{formatINR(breakdown.totalPayable)}</span>
              </div>
              <p className="text-xs text-gray-500">Includes platform fee + applicable GST</p>
            </div>
          )}
          <button
            onClick={onClose}
            className="mt-6 w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2002] p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex items-center justify-between text-white">
          <div>
            <h2 className="text-2xl font-bold">Confirm Trade</h2>
            <p className="text-green-100 text-sm mt-1">Review and finalize this transaction</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Crop Details */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Crop Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 font-semibold uppercase">Crop Name</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{crop.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold uppercase">Quantity</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{crop.quantity} KG</p>
              </div>
            </div>
          </div>

          {/* ── Pricing Details with Fee Breakdown ── */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Receipt size={18} className="text-brand-green" />
              <h3 className="text-lg font-bold text-gray-900">Pricing Breakdown</h3>
            </div>

            <div className="space-y-3">
              {/* Base Price */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700 font-medium">Base Price Per KG</span>
                <span className="text-xl font-bold text-gray-900">₹{crop.basePrice}</span>
              </div>

              {/* Accepted Bid */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <span className="text-gray-700 font-medium">Accepted Bid Amount</span>
                <span className="text-xl font-bold text-blue-600">₹{crop.acceptedAmount?.toLocaleString()}</span>
              </div>

              {/* Fee Breakdown */}
              {breakdown && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-brand-green uppercase tracking-wider">Fee Details (Buyer's View)</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Product GST ({formatPct(breakdown.productGSTRate)})</span>
                    {breakdown.productGST === 0 ? (
                      <span className="font-semibold text-brand-green text-xs bg-brand-green/10 px-2 py-0.5 rounded-full">
                        Exempt ✓
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-900">{formatINR(breakdown.productGST)}</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Platform Fee ({formatPct(breakdown.convenienceFeeRate)})</span>
                    <span className="font-semibold text-gray-900">{formatINR(breakdown.convenienceFee)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 text-xs">GST on Platform Fee (18%)</span>
                    <span className="text-gray-500 text-xs">{formatINR(breakdown.convenienceFeeGST)}</span>
                  </div>

                  <div className="h-px bg-green-200 my-1" />

                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-bold text-sm">Buyer's Total</span>
                    <span className="text-xl font-bold text-green-600">{formatINR(breakdown.totalPayable)}</span>
                  </div>

                  {breakdown.productGST === 0 && (
                    <div className="flex items-start gap-2 pt-2 border-t border-green-200">
                      <Info size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Agricultural produce is GST-exempt under Indian tax law
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Total Summary */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <span className="text-gray-900 font-bold">Trade Value</span>
                <span className="text-2xl font-bold text-green-600">₹{crop.acceptedAmount?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Trade Status */}
          <div className="mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-1">Ready to Finalize</h4>
                <p className="text-sm text-gray-700">
                  By confirming this trade, you authorize the buyer to proceed with payment and delivery arrangements. The trade details will be locked and sent to both parties.
                </p>
              </div>
            </div>
          </div>

          {/* Buyer Info */}
          {acceptedBid && (
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Buyer Information</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 font-semibold uppercase">Buyer ID</p>
                <p className="text-gray-900 font-mono mt-1 break-all">{crop.acceptedBuyerId}</p>
                {acceptedBid.buyerName && (
                  <>
                    <p className="text-sm text-gray-600 font-semibold uppercase mt-4">Buyer Name</p>
                    <p className="text-gray-900 font-bold mt-1">{acceptedBid.buyerName}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
            <div className="text-sm">
              <p className="font-semibold text-yellow-900 mb-2">Important:</p>
              <ul className="text-yellow-800 space-y-1 list-disc list-inside">
                <li>Once confirmed, this trade cannot be canceled</li>
                <li>Both parties will be notified immediately</li>
                <li>Buyer will see the full fee breakdown before payment</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirmTrade}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 transition flex items-center justify-center gap-2"
            >
              {loading && <Loader size={18} className="animate-spin" />}
              {loading ? 'Confirming...' : 'Confirm Trade'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Cancel
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Next Steps:</strong> After confirmation, monitor your dashboard for payment confirmation and logistics coordination with the buyer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeConfirmationModal;
