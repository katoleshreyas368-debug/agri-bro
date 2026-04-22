import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock } from 'lucide-react';
import { calculateFees, formatINR } from '../utils/feeCalculator';

interface PaymentProgressModalProps {
  trade: {
    id: string;
    name: string;
    quantity: number;
    currentBid: number;
    acceptedBuyerId: string;
  };
  onClose: () => void;
  token: string;
  apiUrl: string;
}

const PaymentProgressModal: React.FC<PaymentProgressModalProps> = ({
  trade,
  onClose,
  token,
  apiUrl
}) => {
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'payment_received' | 'confirmed'>('waiting');
  const [confirmationTime, setConfirmationTime] = useState<string>('');

  // Simulate checking payment status
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/crops/${trade.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.tradeStatus === 'confirmed' && data.confirmedByBuyerAt) {
            setPaymentStatus('confirmed');
            setConfirmationTime(new Date(data.confirmedByBuyerAt).toLocaleString());
          } else if (data.tradeStatus === 'accepted') {
            setPaymentStatus('payment_received');
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }
    };

    const interval = setInterval(checkPaymentStatus, 2000);
    checkPaymentStatus();

    return () => clearInterval(interval);
  }, [trade.id, token, apiUrl]);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Payment Status</h2>
          <p className="text-sm text-gray-600 mt-1">Trade Settlement Progress</p>
        </div>

        {/* Trade Summary with Fee Info */}
        <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">{trade.name}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Quantity</span>
              <span className="font-semibold text-gray-900">{trade.quantity} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bid Amount</span>
              <span className="font-semibold text-gray-900">{formatINR(trade.currentBid)}</span>
            </div>
            {(() => {
              const bd = trade.currentBid > 0 ? calculateFees(trade.currentBid, 'fresh_produce') : null;
              if (!bd) return null;
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee + GST</span>
                    <span className="font-semibold text-gray-700 text-xs">{formatINR(bd.convenienceFee + bd.convenienceFeeGST)}</span>
                  </div>
                  <div className="h-px bg-gray-200 my-1" />
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-bold">Buyer Pays</span>
                    <span className="font-bold text-brand-green text-lg">{formatINR(bd.totalPayable)}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Status Timeline */}
        <div className="space-y-4 mb-8">
          {/* Step 1: Bid Accepted */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div className="w-1 h-12 bg-green-200" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Trade Accepted</p>
              <p className="text-xs text-gray-500">You accepted the buyer's bid</p>
            </div>
          </div>

          {/* Step 2: Payment Processing */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                paymentStatus !== 'waiting' 
                  ? 'bg-green-100' 
                  : 'bg-yellow-100 animate-pulse'
              }`}>
                {paymentStatus !== 'waiting' ? (
                  <CheckCircle size={20} className="text-green-600" />
                ) : (
                  <Clock size={20} className="text-yellow-600" />
                )}
              </div>
              <div className="w-1 h-12 bg-gray-200" />
            </div>
            <div>
              <p className={`font-bold ${paymentStatus !== 'waiting' ? 'text-gray-900' : 'text-gray-600'}`}>
                Payment Processing
              </p>
              <p className="text-xs text-gray-500">
                {paymentStatus === 'waiting' ? 'Waiting for buyer to complete payment' : 'Payment received'}
              </p>
            </div>
          </div>

          {/* Step 3: Trade Confirmed */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                paymentStatus === 'confirmed'
                  ? 'bg-green-100'
                  : 'bg-gray-100'
              }`}>
                {paymentStatus === 'confirmed' ? (
                  <CheckCircle size={20} className="text-green-600 animate-bounce" />
                ) : (
                  <Clock size={20} className="text-gray-400" />
                )}
              </div>
            </div>
            <div>
              <p className={`font-bold ${paymentStatus === 'confirmed' ? 'text-gray-900' : 'text-gray-600'}`}>
                Trade Confirmed
              </p>
              <p className="text-xs text-gray-500">
                {paymentStatus === 'confirmed' 
                  ? `Confirmed at ${confirmationTime}`
                  : 'Waiting for buyer confirmation'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        {paymentStatus === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm font-semibold text-green-700">✓ Trade Successfully Completed</p>
            <p className="text-xs text-green-600 mt-1">Payment has been confirmed and transfer initiated</p>
          </div>
        )}

        {paymentStatus === 'payment_received' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm font-semibold text-blue-700">💳 Payment Received</p>
            <p className="text-xs text-blue-600 mt-1">Waiting for final confirmation...</p>
          </div>
        )}

        {paymentStatus === 'waiting' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm font-semibold text-yellow-700 flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-r-transparent" />
              Awaiting Payment
            </p>
            <p className="text-xs text-yellow-600 mt-1">Buyer is completing the payment process</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          {(() => {
            const bd = trade.currentBid > 0 ? calculateFees(trade.currentBid, 'fresh_produce') : null;
            return (
              <>
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Buyer's Total:</strong> {bd ? formatINR(bd.totalPayable) : `₹${trade.currentBid}`}
                </p>
                <p className="text-xs text-gray-500">
                  You receive {formatINR(trade.currentBid)} (trade value). Platform fees are paid by the buyer.
                </p>
              </>
            );
          })()}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default PaymentProgressModal;
