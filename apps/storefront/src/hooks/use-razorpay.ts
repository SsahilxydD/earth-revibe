'use client';

import { useState, useCallback, useRef } from 'react';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  one_click_checkout?: boolean;
  show_coupons?: boolean;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

export interface RazorpayResponse {
  razorpay_order_id: string;
  // Optional: Magic Checkout COD completions have no captured payment, so
  // payment_id/signature may be absent. Callers must branch on these and
  // fall back to polling /checkout/order-status (see lib/cod-order.ts).
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

interface InitiatePaymentParams {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    // Guard against duplicate script injection from concurrent callers
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/magic-checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Preload the Razorpay script early (e.g. on cart open) so it's ready
 * by the time the user clicks checkout. Safe to call multiple times.
 */
export function preloadRazorpayScript() {
  if (typeof window === 'undefined') return;
  if (window.Razorpay) return;
  if (document.querySelector('script[src*="checkout.razorpay.com"]')) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = 'https://checkout.razorpay.com/v1/magic-checkout.js';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/magic-checkout.js';
  script.async = true;
  document.body.appendChild(script);
}

export function useRazorpay() {
  const [isLoading, setIsLoading] = useState(false);
  const razorpayRef = useRef<RazorpayInstance | null>(null);

  const initiatePayment = useCallback(
    async (params: InitiatePaymentParams): Promise<RazorpayResponse | null> => {
      setIsLoading(true);

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setIsLoading(false);
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        setIsLoading(false);
        throw new Error('Razorpay key is not configured.');
      }

      return new Promise<RazorpayResponse | null>((resolve, reject) => {
        const options: RazorpayOptions = {
          key,
          amount: params.amount,
          currency: params.currency || 'INR',
          name: 'Earth Revibe',
          description: params.description || 'Order Payment',
          order_id: params.razorpayOrderId,
          prefill: {
            name: params.customerName,
            email: params.customerEmail,
            contact: params.customerPhone,
          },
          theme: {
            color: '#121212',
          },
          one_click_checkout: true,
          show_coupons: true,
          handler: (response: RazorpayResponse) => {
            setIsLoading(false);
            resolve(response);
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              resolve(null);
            },
          },
        };

        try {
          const rzp = new window.Razorpay(options);
          razorpayRef.current = rzp;
          rzp.open();
        } catch {
          setIsLoading(false);
          reject(new Error('Failed to initialize Razorpay checkout.'));
        }
      });
    },
    []
  );

  return { initiatePayment, isLoading };
}
