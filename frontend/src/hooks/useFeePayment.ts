// ============================================================
// useFeePayment — Hook that combines fee calculation with
//                 Razorpay payment using the fee-aware endpoint
//
// Usage:
//   const { breakdown, createFeeOrder, isLoading, error } = useFeePayment();
//
//   // Show breakdown to user first:
//   const b = breakdown(5000, 'seeds');
//
//   // When user clicks "Pay":
//   const result = await createFeeOrder({
//     amount: 5000,
//     productCategory: 'seeds',
//     productId: 'prod_123',
//   });
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { calculateFees, type FeeBreakdown } from '../utils/feeCalculator';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

// ── Script loader (shared with useRazorpay) ─────────────────
let razorpayScriptLoaded = false;
let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (razorpayScriptLoaded) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      razorpayScriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => { razorpayScriptLoaded = true; resolve(); };
    script.onerror = () => { razorpayScriptPromise = null; reject(new Error('Failed to load Razorpay')); };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

// ── Types ───────────────────────────────────────────────────
interface FeeOrderOptions {
  amount: number;
  productCategory: string;
  productId?: string;
  description?: string;
  notes?: Record<string, string>;
  prefill?: { name?: string; email?: string; contact?: string };
}

interface FeePaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  feeBreakdown?: FeeBreakdown;
  error?: string;
}

interface UseFeePaymentReturn {
  /** Client-side fee calculation (instant, no API call) */
  getBreakdown: (amount: number, category: string) => FeeBreakdown;
  /** Create a fee-aware Razorpay order and open checkout */
  createFeeOrder: (options: FeeOrderOptions) => Promise<FeePaymentResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

// ── Hook ────────────────────────────────────────────────────
export function useFeePayment(): UseFeePaymentReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Instant client-side calculation (no API call)
  const getBreakdown = useCallback((amount: number, category: string) => {
    return calculateFees(amount, category);
  }, []);

  // Full flow: calculate fees → create order → open Razorpay → verify
  const createFeeOrder = useCallback(async (options: FeeOrderOptions): Promise<FeePaymentResult> => {
    if (!RAZORPAY_KEY_ID) {
      const msg = 'Razorpay Key ID not configured. Add VITE_RAZORPAY_KEY_ID to .env.';
      setError(msg);
      return { success: false, error: msg };
    }

    if (!user?.id) {
      const msg = 'You must be logged in to make a payment.';
      setError(msg);
      return { success: false, error: msg };
    }

    setIsLoading(true);
    setError(null);

    try {
      // ── Step 1: Load Razorpay script ──
      await loadRazorpayScript();

      // ── Step 2: Create fee-aware order on backend ──
      const orderRes = await fetch(`${API}/payment/create-order-with-fees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          amount: options.amount,
          productCategory: options.productCategory,
          productId: options.productId,
          notes: options.notes,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.message || `Order creation failed (${orderRes.status})`);
      }

      const { order, feeBreakdown } = await orderRes.json();

      // ── Step 3: Open Razorpay checkout ──
      const result = await new Promise<FeePaymentResult>((resolve) => {
        const rzpOptions = {
          key: RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: 'AGRIBro',
          description: options.description || `Payment: ${feeBreakdown.categoryLabel}`,
          order_id: order.id,
          prefill: {
            name: options.prefill?.name || user?.name || '',
            email: options.prefill?.email || '',
            contact: options.prefill?.contact || user?.phone || '',
          },
          theme: { color: '#2E7D32' },

          handler: async (response: any) => {
            try {
              // ── Step 4: Verify payment ──
              const verifyRes = await fetch(`${API}/payment/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${user.id}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();

              if (verifyData.success) {
                resolve({
                  success: true,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                  feeBreakdown,
                });
              } else {
                resolve({
                  success: false,
                  error: verifyData.message || 'Payment verification failed.',
                });
              }
            } catch (verifyErr: any) {
              resolve({
                success: false,
                error: verifyErr.message || 'Payment verification request failed.',
              });
            }
          },

          modal: {
            ondismiss: () => {
              resolve({ success: false, error: 'Payment cancelled by user.' });
            },
          },
        };

        // @ts-ignore — Razorpay is loaded dynamically
        const rzp = new window.Razorpay(rzpOptions);
        rzp.on('payment.failed', (response: any) => {
          resolve({
            success: false,
            error: response.error?.description || 'Payment failed. Please try again.',
          });
        });
        rzp.open();
      });

      if (isMounted.current) {
        if (!result.success) setError(result.error || 'Payment failed.');
        setIsLoading(false);
      }

      return result;
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred.';
      if (isMounted.current) {
        setError(errMsg);
        setIsLoading(false);
      }
      return { success: false, error: errMsg };
    }
  }, [user]);

  return { getBreakdown, createFeeOrder, isLoading, error, clearError };
}
