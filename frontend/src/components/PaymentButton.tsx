// ============================================================
// PaymentButton — Reusable Razorpay Payment Component
//
// Usage:
//   <PaymentButton
//     amount={1500}
//     description="Purchase: Organic Seeds"
//     onSuccess={(result) => console.log('Paid!', result)}
//     onFailure={(error) => console.log('Failed:', error)}
//   />
//
// This component integrates with the useRazorpay hook and
// provides a styled, animated button with loading & error states.
// ============================================================

import React, { useState } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { useRazorpay } from '../hooks/useRazorpay';

interface PaymentButtonProps {
  amount: number;                     // Amount in ₹
  currency?: string;                  // Default: 'INR'
  description?: string;               // Description shown in Razorpay popup
  receipt?: string;                    // Custom receipt ID
  notes?: Record<string, string>;     // Additional metadata
  buttonText?: string;                // Custom button label
  className?: string;                 // Additional CSS classes
  disabled?: boolean;                 // Disable the button
  fullWidth?: boolean;                // Full-width button
  onSuccess?: (result: {
    paymentId: string;
    orderId: string;
    signature: string;
  }) => void;
  onFailure?: (error: string) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  currency = 'INR',
  description,
  receipt,
  notes,
  buttonText,
  className = '',
  disabled = false,
  fullWidth = false,
  onSuccess,
  onFailure,
  prefill,
}) => {
  const { initiatePayment, isLoading, error, clearError } = useRazorpay();
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handlePayment = async () => {
    // Reset previous success state
    setPaymentSuccess(false);

    const result = await initiatePayment({
      amount,
      currency,
      description,
      receipt,
      notes,
      prefill,
    });

    if (result.success) {
      setPaymentSuccess(true);
      onSuccess?.({
        paymentId: result.paymentId!,
        orderId: result.orderId!,
        signature: result.signature!,
      });

      // Reset success indicator after 3 seconds
      setTimeout(() => setPaymentSuccess(false), 3000);
    } else {
      onFailure?.(result.error || 'Payment failed');
    }
  };

  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'}`}>
      {/* ── Main Payment Button ── */}
      <button
        onClick={handlePayment}
        disabled={disabled || isLoading || amount <= 0}
        className={`
          relative overflow-hidden group
          ${fullWidth ? 'w-full' : ''}
          ${paymentSuccess
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-brand-green hover:bg-brand-green-dark'
          }
          text-white font-semibold py-3 px-6 rounded-xl
          transition-all duration-300 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2.5
          shadow-md hover:shadow-lg
          active:scale-[0.98]
          ${className}
        `}
      >
        {/* Shimmer effect on hover */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />

        {/* Button content */}
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : paymentSuccess ? (
          <>
            <CheckCircle className="h-5 w-5" />
            <span>Payment Successful!</span>
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            <span>{buttonText || `Pay ₹${amount.toLocaleString('en-IN')}`}</span>
          </>
        )}
      </button>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentButton;
