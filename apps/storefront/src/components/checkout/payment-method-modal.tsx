'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/cart-store';
import { useCheckoutConfig } from '@/hooks/use-checkout-config';
import { formatPrice } from '@/lib/utils';
import { lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';

/* ------------------------------------------------------------------ */
/*  PaymentMethodModal — bottom sheet                                   */
/*  Matches the Pencil design exactly: white sheet with rounded top    */
/*  corners, editorial italic hero total, two option cards (Pay online */
/*  selected by default), and a confirm button with baked-in total.    */
/* ------------------------------------------------------------------ */

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrepaid: () => void;
  onSelectCOD: () => void;
  /**
   * Optional override for direct Buy Now flows — lets the sheet show the
   * single-variant price instead of the full cart total.
   */
  subtotalOverride?: number;
}

type Method = 'prepaid' | 'cod';

export function PaymentMethodModal({
  isOpen,
  onClose,
  onSelectPrepaid,
  onSelectCOD,
  subtotalOverride,
}: PaymentMethodModalProps) {
  const getTotal = useCartStore((s) => s.getTotal);
  const subtotal = subtotalOverride ?? getTotal();
  // COD fee from the server (single source of truth) — what's shown here is
  // exactly what createCodOrder charges. Defaults to 0 until config loads.
  const { data: checkoutConfig } = useCheckoutConfig();
  const codSurcharge = checkoutConfig?.codFee ?? 0;
  const codTotal = subtotal + codSurcharge;

  const [method, setMethod] = useState<Method>('prepaid');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMethod('prepaid');
      lockBodyScroll();
    }
    return () => {
      if (isOpen) unlockBodyScroll();
    };
  }, [isOpen]);

  const displayedTotal = method === 'prepaid' ? subtotal : codTotal;

  const handleConfirm = () => {
    onClose();
    if (method === 'prepaid') onSelectPrepaid();
    else onSelectCOD();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 80,
              backgroundColor: 'rgba(0,0,0,0.42)',
            }}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="font-[family-name:var(--font-inter)]"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 81,
              backgroundColor: '#FAF7F0',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px 0' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5' }} />
            </div>

            {/* Header — title + close */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px 16px 24px',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 500, color: '#000' }}>
                How you&apos;d like to pay?
              </span>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
                aria-label="Close"
              >
                <X size={18} color="#000" />
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

            {/* Hero total — centered editorial moment */}
            <div
              style={{
                padding: '24px 24px 24px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  letterSpacing: 2,
                  color: '#999',
                }}
              >
                YOU PAY
              </span>
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 300,
                  fontStyle: 'italic',
                  letterSpacing: -2,
                  color: '#000',
                  lineHeight: 1,
                }}
              >
                {formatPrice(displayedTotal)}
              </span>
            </div>

            {/* Option cards */}
            <div
              style={{
                padding: '0 20px 20px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Pay online card */}
              <button
                type="button"
                onClick={() => setMethod('prepaid')}
                style={{
                  width: '100%',
                  height: 84,
                  padding: '0 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderRadius: 14,
                  backgroundColor: method === 'prepaid' ? '#000' : '#FFF',
                  border: method === 'prepaid' ? '1px solid #000' : '1px solid #E5E5E5',
                  cursor: 'pointer',
                  transition: 'background-color 200ms, border-color 200ms',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: method === 'prepaid' ? '#FFF' : '#000',
                    }}
                  >
                    Pay online
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 300,
                      letterSpacing: 0.3,
                      color: method === 'prepaid' ? 'rgba(255,255,255,0.7)' : '#999',
                    }}
                  >
                    UPI, Cards, Netbanking
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: method === 'prepaid' ? '#FFF' : '#000',
                  }}
                >
                  {formatPrice(subtotal)}
                </span>
              </button>

              {/* Cash on delivery card */}
              <button
                type="button"
                onClick={() => setMethod('cod')}
                style={{
                  width: '100%',
                  height: 84,
                  padding: '0 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderRadius: 14,
                  backgroundColor: method === 'cod' ? '#000' : '#FFF',
                  border: method === 'cod' ? '1px solid #000' : '1px solid #E5E5E5',
                  cursor: 'pointer',
                  transition: 'background-color 200ms, border-color 200ms',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 400,
                      color: method === 'cod' ? '#FFF' : '#000',
                    }}
                  >
                    Cash on delivery
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 300,
                      letterSpacing: 0.3,
                      color: method === 'cod' ? 'rgba(255,255,255,0.7)' : '#999',
                    }}
                  >
                    Pay at your doorstep
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 4,
                  }}
                >
                  {/* JTvE8 — main price = original subtotal, no markup */}
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: method === 'cod' ? '#FFF' : '#000',
                    }}
                  >
                    {formatPrice(subtotal)}
                  </span>
                  {/* sUdKW — bolder COD fee annotation: solid color, 11/300.
                      Only shown when a real fee applies. */}
                  {codSurcharge > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 300,
                        color: method === 'cod' ? '#FFF' : '#000',
                      }}
                    >
                      +{formatPrice(codSurcharge)} COD charge
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Confirm button + secured line */}
            <div
              style={{
                padding: '4px 20px 20px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 9999,
                  backgroundColor: '#000',
                  color: '#FFF',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: 1.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                CONFIRM &nbsp;·&nbsp; {formatPrice(displayedTotal)}
              </button>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  paddingTop: 4,
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#999"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 300,
                    letterSpacing: 0.5,
                    color: '#999',
                  }}
                >
                  Secured by Razorpay
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
