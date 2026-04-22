// ============================================================
// useRazorpay — Custom hook for Razorpay Payment Integration
//
// Handles:
//  1. Dynamically loading the Razorpay checkout script
//  2. Creating a backend order
//  3. Opening the Razorpay checkout popup
//  4. Verifying the payment on the backend
//  5. Error handling throughout the flow
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

// ── Types ────────────────────────────────────────────────────

interface PaymentOptions {
  amount: number;           // Amount in ₹ (not paise)
  currency?: string;        // Default: 'INR'
  receipt?: string;         // Custom receipt ID
  notes?: Record<string, string>;
  description?: string;     // Shown in Razorpay popup
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
}

interface UseRazorpayReturn {
  initiatePayment: (options: PaymentOptions) => Promise<PaymentResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

// ── Razorpay Script Loader ──────────────────────────────────
// Loads the Razorpay checkout.js script dynamically and caches it.

let razorpayScriptLoaded = false;
let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (razorpayScriptLoaded) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    // Check if already in DOM (e.g., added via index.html)
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      razorpayScriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      razorpayScriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error('Failed to load Razorpay script. Check your internet connection.'));
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

// ── Hook ─────────────────────────────────────────────────────

export function useRazorpay(): UseRazorpayReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const initiatePayment = useCallback(
    async (options: PaymentOptions): Promise<PaymentResult> => {
      // ── Pre-flight checks ──
      if (!RAZORPAY_KEY_ID) {
        const errMsg = 'Razorpay Key ID is not configured. Add VITE_RAZORPAY_KEY_ID to your .env file.';
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      if (!user?.id) {
        const errMsg = 'You must be logged in to make a payment.';
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      setIsLoading(true);
      setError(null);

      try {
        // ── Step 1: Load Razorpay script ──
        await loadRazorpayScript();

        // ── Step 2: Create order on backend ──
        const orderRes = await fetch(`${API}/payment/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.id}`,
          },
          body: JSON.stringify({
            amount: options.amount,
            currency: options.currency || 'INR',
            receipt: options.receipt,
            notes: options.notes,
          }),
        });

        if (!orderRes.ok) {
          const errData = await orderRes.json().catch(() => ({}));
          throw new Error(errData.message || `Order creation failed (${orderRes.status})`);
        }

        const { order } = await orderRes.json();

        // ── Step 3: Open Razorpay checkout popup ──
        const result = await new Promise<PaymentResult>((resolve) => {
          const rzpOptions = {
            key: RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'AGRIBro',
            description: options.description || 'Payment for your order',
            order_id: order.id,
            prefill: {
              name: options.prefill?.name || user?.name || '',
              email: options.prefill?.email || '',
              contact: options.prefill?.contact || user?.phone || '',
            },
            theme: {
              color: '#2E7D32', // Brand green
            },
            // ── Success handler ──
            handler: async (response: any) => {
              try {
                // ── Step 4: Verify payment on backend ──
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
            // ── Popup dismissed / payment cancelled ──
            modal: {
              ondismiss: () => {
                resolve({
                  success: false,
                  error: 'Payment cancelled by user.',
                });
              },
            },
          };

          // @ts-ignore — Razorpay is loaded dynamically
          const rzp = new window.Razorpay(rzpOptions);

          // ── Payment failure handler ──
          rzp.on('payment.failed', (response: any) => {
            const failReason =
              response.error?.description ||
              response.error?.reason ||
              'Payment failed. Please try again.';
            resolve({ success: false, error: failReason });
          });

          rzp.open();
        });

        // Update hook state based on result
        if (isMounted.current) {
          if (!result.success) {
            setError(result.error || 'Payment failed.');
          }
          setIsLoading(false);
        }

        return result;
      } catch (err: any) {
        const errMsg = err.message || 'An unexpected error occurred during payment.';
        if (isMounted.current) {
          setError(errMsg);
          setIsLoading(false);
        }
        return { success: false, error: errMsg };
      }
    },
    [user]
  );

  return { initiatePayment, isLoading, error, clearError };
}
