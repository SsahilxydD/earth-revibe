'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { primaryImageUrl, toNumber } from '@/lib/flight-mode-data';
import { lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';
import type { Product } from '@/types';

/* ------------------------------------------------------------------ */
/*  SwapSheet — bottom sheet for picking a replacement SKU             */
/*                                                                      */
/*  Used by the combo detail page and by step 2 of the kit builder.    */
/*  Shows every product in the vibe pool as a 2-col grid. The current  */
/*  slot's product is highlighted, pieces already in other slots are   */
/*  disabled so the customer can't accidentally dupe.                  */
/* ------------------------------------------------------------------ */

interface SwapSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pool: Product[];
  currentId: string | null;
  /** IDs of pieces already used in other slots (so we can disable dupes). */
  takenIds: string[];
  onSelect: (product: Product) => void;
  /** Kind label shown in the header — e.g. "PIECE" or the category name. */
  kindLabel?: string;
}

export function SwapSheet({
  isOpen,
  onClose,
  pool,
  currentId,
  takenIds,
  onSelect,
  kindLabel = 'PIECE',
}: SwapSheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    }
    return () => {
      if (isOpen) unlockBodyScroll();
    };
  }, [isOpen]);

  if (!mounted) return null;

  const takenSet = new Set(takenIds.filter((id) => id !== currentId));

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
              backgroundColor: '#FFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px 0' }}>
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#E5E5E5',
                }}
              />
            </div>

            {/* Header */}
            <div
              style={{
                padding: '8px 24px 16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 2,
                    color: '#999',
                  }}
                >
                  SWAP · {kindLabel.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 400,
                    letterSpacing: -0.3,
                    color: '#000',
                  }}
                >
                  Pick a replacement
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
              >
                <X size={18} color="#000" />
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

            {/* Grid */}
            <div
              className="hide-scrollbar"
              style={{
                overflowY: 'auto',
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              {pool.length === 0 ? (
                <div
                  style={{
                    gridColumn: 'span 2',
                    padding: '40px 0',
                    textAlign: 'center',
                    fontSize: 12,
                    color: '#999',
                    fontStyle: 'italic',
                  }}
                >
                  No other pieces available in this collection.
                </div>
              ) : (
                pool.map((product) => {
                  const img = primaryImageUrl(product);
                  const isCurrent = product.id === currentId;
                  const isTaken = takenSet.has(product.id);
                  const disabled = isTaken;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        if (disabled) return;
                        if (isCurrent) {
                          onClose();
                          return;
                        }
                        onSelect(product);
                        onClose();
                      }}
                      disabled={disabled}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          aspectRatio: '3 / 4',
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: '#F5F5F5',
                          border: isCurrent ? '2px solid #000' : '1px solid #F0F0F0',
                        }}
                      >
                        {img && (
                          <Image
                            src={getImageUrl(img, 400)}
                            alt={product.name}
                            fill
                            sizes="(max-width: 393px) 50vw, 180px"
                            style={{ objectFit: 'cover' }}
                          />
                        )}
                        {isCurrent && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              width: 22,
                              height: 22,
                              borderRadius: 9999,
                              backgroundColor: '#000',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={12} color="#FFF" />
                          </div>
                        )}
                        {isTaken && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              height: 20,
                              padding: '0 8px',
                              borderRadius: 9999,
                              backgroundColor: 'rgba(0,0,0,0.78)',
                              color: '#FFF',
                              fontSize: 8,
                              fontWeight: 500,
                              letterSpacing: 1.5,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            IN KIT
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 400,
                            color: '#000',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {product.name}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 300, color: '#666' }}>
                          {formatPrice(toNumber(product.price))}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
