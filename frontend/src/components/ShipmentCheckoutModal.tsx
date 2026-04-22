// ============================================================
// ShipmentCheckoutModal — Full Fee Breakdown + Razorpay Checkout
//
// Shows: Base Freight → Distance Surcharge → Loading Charges →
//        Convenience Fee + GST → Insurance → Total Payable
//
// Status Flow: PENDING → PAID → NOTIFIED → PICKED UP → DELIVERED
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  X, Truck, CheckCircle, AlertCircle,
  Package, CreditCard, Shield, Clock, ArrowRight,
  TrendingUp, Percent, ShieldCheck, Loader2
} from 'lucide-react';
import { useShipmentPayment, ShipmentPaymentOptions } from '../hooks/useShipmentPayment';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ShipmentForCheckout {
  id: string;
  trackingId?: string;
  cropType: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  freightAmount: number;
  farmerId?: string;
  farmerName?: string;
  farmerPhone?: string;
  transporterId?: string;
  transporterName?: string;
  requestedDate?: string;
}

interface FeeBreakdown {
  baseFreight: number;
  ratePerKg: number;
  weightKg: number;
  distanceSurcharge: number;
  loadingCharges: number;
  transportSubtotal: number;
  convenienceFee: number;
  convenienceFeeRate: number;
  convenienceFeeGST: number;
  convenienceFeeGSTRate: number;
  insurance: number;
  insuranceRate: number;
  totalPayable: number;
  amountInPaise: number;
  gatewayFee: number;
  gatewayFeeRate: number;
  gatewayFeeGST: number;
  merchantCost: number;
  isSameCity: boolean;
}

interface ShipmentCheckoutModalProps {
  shipment: ShipmentForCheckout;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  userRole?: string;
  onClose: () => void;
  onPaymentComplete: (shipmentId: string, paymentId: string) => void;
}

const STATUS_FLOW = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'BUYER_PAYMENT_DONE', label: 'Paid' },
  { key: 'FARMER_NOTIFIED', label: 'Notified' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const ShipmentCheckoutModal: React.FC<ShipmentCheckoutModalProps> = ({
  shipment,
  buyerName,
  buyerPhone,
  buyerEmail,
  userRole,
  onClose,
  onPaymentComplete,
}) => {
  const { user } = useAuth();
  const { payFreight, isLoading } = useShipmentPayment();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paymentId, setPaymentId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fees, setFees] = useState<FeeBreakdown | null>(null);
  const [feesLoading, setFeesLoading] = useState(true);

  // ── Fetch fee breakdown on mount ──
  useEffect(() => {
    const fetchFees = async () => {
      setFeesLoading(true);
      try {
        const res = await fetch(`${API}/shipment-payment/calculate-fees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.id}`,
          },
          body: JSON.stringify({
            weightKg: shipment.quantity,
            goodsType: shipment.cropType,
            fromLocation: shipment.fromLocation,
            toLocation: shipment.toLocation,
          }),
        });
        const data = await res.json();
        if (data.success && data.fees) {
          setFees(data.fees);
        }
      } catch (err) {
        console.error('Failed to fetch fees:', err);
      } finally {
        setFeesLoading(false);
      }
    };
    fetchFees();
  }, [shipment, user]);

  const totalAmount = fees?.totalPayable ?? shipment.freightAmount;

  const handlePayment = async () => {
    setStatus('processing');
    setErrorMessage('');

    const options: ShipmentPaymentOptions = {
      shipmentId: shipment.id,
      freightAmount: totalAmount,
      buyerName: buyerName || '',
      buyerPhone: buyerPhone || '',
      buyerEmail: buyerEmail || '',
      farmerId: shipment.farmerId || '',
      farmerName: shipment.farmerName || '',
      transporterId: shipment.transporterId || '',
      transporterName: shipment.transporterName || '',
      pickupLocation: shipment.fromLocation,
      dropLocation: shipment.toLocation,
      goodsType: shipment.cropType,
      weightKg: shipment.quantity,
    };

    const result = await payFreight(options);

    if (result.success) {
      setStatus('success');
      setPaymentId(result.paymentId || '');
      setTimeout(() => {
        onPaymentComplete(shipment.id, result.paymentId || '');
      }, 3000);
    } else {
      setStatus('failed');
      setErrorMessage(result.error || 'Payment failed.');
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Success View ──
  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-[28px] w-full max-w-md p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={48} className="text-green-600 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Freight Paid!</h2>
          <p className="text-gray-500 mb-6">Farmer has been notified. Pickup will be arranged shortly.</p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment ID</span>
              <span className="font-mono font-bold text-gray-900 text-xs">{paymentId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount</span>
              <span className="font-bold text-green-600">{fmt(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status</span>
              <span className="font-bold text-green-600">BUYER_PAYMENT_DONE</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 mb-6 overflow-x-auto">
            {STATUS_FLOW.map((s, i) => (
              <React.Fragment key={s.key}>
                <div className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${i <= 1 ? 'text-green-700 bg-green-100' : 'text-gray-400 bg-gray-50'}`}>
                  {s.label}
                </div>
                {i < STATUS_FLOW.length - 1 && <ArrowRight size={10} className={i <= 0 ? 'text-green-400' : 'text-gray-200'} />}
              </React.Fragment>
            ))}
          </div>
          <button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition">Done</button>
        </div>
      </div>
    );
  }

  // ── Failed View ──
  if (status === 'failed') {
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-[28px] w-full max-w-md p-8 text-center shadow-2xl">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={48} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-500 mb-2">{errorMessage}</p>
          <p className="text-sm text-gray-400 mb-6">Your shipment remains in PENDING status. No charges were applied.</p>
          <button onClick={() => { setStatus('idle'); setErrorMessage(''); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition mb-3">Try Again</button>
          <button onClick={onClose} className="w-full border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        </div>
      </div>
    );
  }

  // ── Main Checkout View with Fee Breakdown ──
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[28px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 p-6 rounded-t-[28px]">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition">
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Truck size={24} className="text-white" />
            </div>
            <div>
              <p className="text-green-100 text-[10px] font-bold uppercase tracking-widest">Freight Payment</p>
              <h2 className="text-xl font-black text-white">Confirm Shipment</h2>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {STATUS_FLOW.map((s, i) => (
              <React.Fragment key={s.key}>
                <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider whitespace-nowrap ${i === 0 ? 'bg-white/30 text-white' : 'bg-white/10 text-white/50'}`}>
                  {s.label}
                </div>
                {i < STATUS_FLOW.length - 1 && <ArrowRight size={8} className="text-white/30 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Shipment Details Card */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Package size={14} className="text-brand-green" />
              <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest">Shipment Details</span>
              {shipment.trackingId && <span className="ml-auto text-[10px] font-mono text-gray-400">{shipment.trackingId}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Goods</p>
                <p className="text-sm font-bold text-gray-900">{shipment.cropType}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Weight</p>
                <p className="text-sm font-bold text-gray-900">{shipment.quantity} KG</p>
              </div>
            </div>
            {/* Route */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 mt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div className="w-px h-6 bg-gray-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Pickup</p>
                  <p className="text-sm font-semibold text-gray-800">{shipment.fromLocation}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Drop-off</p>
                  <p className="text-sm font-semibold text-gray-800">{shipment.toLocation}</p>
                </div>
              </div>
            </div>
            {/* Stakeholders */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
              {buyerName && (
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                    {userRole === 'vendor' ? 'Vendor' : userRole === 'farmer' ? 'Farmer' : userRole === 'buyer' ? 'Buyer' : 'Paid By'}
                  </p>
                  <p className="text-sm font-semibold text-gray-800">{buyerName}</p>
                </div>
              )}
              {shipment.transporterName && (
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Transporter</p>
                  <p className="text-sm font-semibold text-gray-800">{shipment.transporterName}</p>
                </div>
              )}
            </div>
          </div>

          {/* ═══ FEE BREAKDOWN CARD ═══ */}
          <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-white rounded-2xl border border-green-200 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Fee Breakdown</span>
            </div>

            {feesLoading ? (
              <div className="px-5 pb-5 flex items-center justify-center gap-2 py-8">
                <Loader2 size={20} className="text-green-600 animate-spin" />
                <span className="text-sm text-gray-500">Calculating fees...</span>
              </div>
            ) : fees ? (
              <div className="px-5 pb-5">
                {/* Line Items */}
                <div className="space-y-2.5">
                  {/* Base Transportation */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Truck size={12} className="text-gray-400" />
                      <span className="text-sm text-gray-700">Transportation</span>
                      <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{fees.weightKg} kg × ₹{fees.ratePerKg}/kg</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{fmt(fees.baseFreight)}</span>
                  </div>

                  {/* Distance Surcharge */}
                  {fees.distanceSurcharge > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <ArrowRight size={12} className="text-gray-400" />
                        <span className="text-sm text-gray-700">Distance Surcharge</span>
                        <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Inter-city 5%</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{fmt(fees.distanceSurcharge)}</span>
                    </div>
                  )}

                  {/* Loading Charges */}
                  {fees.loadingCharges > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Package size={12} className="text-gray-400" />
                        <span className="text-sm text-gray-700">Loading / Unloading</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{fmt(fees.loadingCharges)}</span>
                    </div>
                  )}

                  {/* Transport Subtotal */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500 font-bold uppercase">Transport Subtotal</span>
                    <span className="text-sm font-bold text-gray-800">{fmt(fees.transportSubtotal)}</span>
                  </div>

                  {/* Convenience Fee */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Percent size={12} className="text-blue-400" />
                      <span className="text-sm text-gray-700">Convenience Fee</span>
                      <span className="text-[9px] text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded">{(fees.convenienceFeeRate * 100)}%</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{fmt(fees.convenienceFee)}</span>
                  </div>

                  {/* GST on Convenience */}
                  <div className="flex justify-between items-center pl-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">GST on Conv. Fee</span>
                      <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{(fees.convenienceFeeGSTRate * 100)}%</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{fmt(fees.convenienceFeeGST)}</span>
                  </div>

                  {/* Insurance */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={12} className="text-emerald-400" />
                      <span className="text-sm text-gray-700">Goods Insurance</span>
                      <span className="text-[9px] text-emerald-400 bg-emerald-50 px-1.5 py-0.5 rounded">{(fees.insuranceRate * 100)}%</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{fmt(fees.insurance)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t-2 border-green-300 flex justify-between items-baseline">
                  <span className="text-sm font-black text-gray-900 uppercase tracking-wider">Total Payable</span>
                  <span className="text-2xl font-black text-green-700">{fmt(fees.totalPayable)}</span>
                </div>

                {/* Merchant-absorbed gateway fee note */}
                <div className="mt-3 bg-white/80 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-start gap-2">
                    <CreditCard size={12} className="text-gray-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        Payment gateway fee ({fmt(fees.gatewayFee)} + {fmt(fees.gatewayFeeGST)} GST = {fmt(fees.merchantCost)}) is absorbed by AGRIBro. You pay only {fmt(fees.totalPayable)}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback: simple amount */
              <div className="px-5 pb-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">{fmt(shipment.freightAmount)}</span>
                  <span className="text-sm text-gray-400">total freight</span>
                </div>
              </div>
            )}
          </div>

          {/* Processing State */}
          {status === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <div className="animate-spin"><Clock size={20} className="text-blue-600" /></div>
              <div>
                <p className="font-semibold text-blue-900 text-sm">Processing Payment…</p>
                <p className="text-xs text-blue-700">Please complete the checkout in the popup</p>
              </div>
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={isLoading || status === 'processing' || feesLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-600/20 active:scale-[0.98]"
          >
            {isLoading || status === 'processing' ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-r-transparent" />
                Processing…
              </>
            ) : (
              <>
                <CreditCard size={20} />
                Pay {fmt(totalAmount)}
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <Shield size={12} className="text-green-600" />
            Secure Payment via Razorpay
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShipmentCheckoutModal;
