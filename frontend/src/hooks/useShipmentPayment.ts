// ============================================================
// useShipmentPayment — Hook for buyer freight payment via Razorpay
//
// Handles the full flow:
//   1. Create freight order on backend (with dedup guard)
//   2. Open Razorpay checkout popup
//   3. Verify payment signature on backend
//   4. Return result with shipment status update
//
// Usage:
//   const { payFreight, isLoading, error } = useShipmentPayment();
//   const result = await payFreight({ shipmentId, freightAmount, ... });
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

// ── Types ────────────────────────────────────────────────────

export interface ShipmentPaymentOptions {
  shipmentId: string;
  freightAmount: number;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  farmerId?: string;
  farmerName?: string;
  transporterId?: string;
  transporterName?: string;
  pickupLocation?: string;
  dropLocation?: string;
  goodsType?: string;
  weightKg?: number;
}

export interface ShipmentPaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  shipmentStatus?: string;
  error?: string;
}

// ── Razorpay script loader (shared singleton) ───────────────

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
    script.onerror = () => { razorpayScriptPromise = null; reject(new Error('Failed to load Razorpay script')); };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

// ── Hook ─────────────────────────────────────────────────────

export function useShipmentPayment() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const payFreight = useCallback(
    async (options: ShipmentPaymentOptions): Promise<ShipmentPaymentResult> => {
      // Pre-flight
      if (!RAZORPAY_KEY_ID) {
        const errMsg = 'Razorpay Key ID is not configured. Add VITE_RAZORPAY_KEY_ID to .env';
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
        // Step 1: Load Razorpay script
        await loadRazorpayScript();

        // Step 2: Create order on backend
        const orderRes = await fetch(`${API}/shipment-payment/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.id}`,
          },
          body: JSON.stringify({
            shipmentId: options.shipmentId,
            freightAmount: options.freightAmount,
            buyerName: options.buyerName || user.name || '',
            buyerPhone: options.buyerPhone || '',
            farmerId: options.farmerId || '',
            farmerName: options.farmerName || '',
            transporterId: options.transporterId || '',
            transporterName: options.transporterName || '',
            pickupLocation: options.pickupLocation || '',
            dropLocation: options.dropLocation || '',
            goodsType: options.goodsType || '',
            weightKg: options.weightKg || 0,
          }),
        });

        if (!orderRes.ok) {
          const errData = await orderRes.json().catch(() => ({}));
          throw new Error(errData.message || `Order creation failed (${orderRes.status})`);
        }

        const { order } = await orderRes.json();

        // Step 3: Open Razorpay checkout
        const result = await new Promise<ShipmentPaymentResult>((resolve) => {
          const rzpOptions = {
            key: RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency || 'INR',
            name: 'AGRIBro Logistics',
            description: `Freight: ${options.goodsType || 'Shipment'} — ${options.weightKg || ''}kg`,
            order_id: order.id,
            prefill: {
              name: options.buyerName || user.name || '',
              email: options.buyerEmail || '',
              contact: options.buyerPhone || '',
            },
            theme: {
              color: '#2E7D32',
            },
            notes: {
              shipmentId: options.shipmentId,
              pickupLocation: options.pickupLocation || '',
              dropLocation: options.dropLocation || '',
            },
            // Success handler
            handler: async (response: any) => {
              try {
                // Step 4: Verify payment on backend
                const verifyRes = await fetch(`${API}/shipment-payment/verify`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.id}`,
                  },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    shipmentId: options.shipmentId,
                  }),
                });

                const verifyData = await verifyRes.json();

                if (verifyData.success) {
                  resolve({
                    success: true,
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                    signature: response.razorpay_signature,
                    shipmentStatus: 'BUYER_PAYMENT_DONE',
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
                  error: verifyErr.message || 'Verification request failed.',
                });
              }
            },
            modal: {
              ondismiss: () => {
                resolve({ success: false, error: 'Payment cancelled by user.' });
              },
            },
          };

          // @ts-ignore
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
    },
    [user]
  );

  return { payFreight, isLoading, error, clearError };
}
