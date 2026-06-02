'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReturnType, ReturnReason, type ProductVariant } from '@earth-revibe/shared';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api-error';
import { useToast } from '@/providers';
import { getImageUrl } from '@/lib/utils';

export interface ReturnableItem {
  id: string;
  productName: string;
  productImage: string | null;
  productSlug: string | null;
  variantId: string;
  variantSize: string;
  variantColor: string;
  quantity: number;
  alreadyReturnedQty?: number;
  unitPrice: number;
}

interface Props {
  orderNumber: string;
  items: ReturnableItem[];
  isOpen: boolean;
  onClose: () => void;
}

const REASON_LABELS: Record<string, string> = {
  [ReturnReason.DEFECTIVE]: 'Defective / faulty',
  [ReturnReason.DAMAGED_IN_TRANSIT]: 'Arrived damaged',
  [ReturnReason.WRONG_ITEM]: 'Wrong item received',
  [ReturnReason.NOT_AS_DESCRIBED]: 'Not as described',
  [ReturnReason.SIZE_TOO_SMALL]: 'Size too small',
  [ReturnReason.SIZE_TOO_LARGE]: 'Size too large',
  [ReturnReason.CHANGED_MIND]: 'Changed my mind',
  [ReturnReason.OTHER]: 'Other',
};

const label = { fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 } as const;

export function ReturnRequestModal({ orderNumber, items, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [type, setType] = useState<ReturnType>(ReturnType.REFUND);
  // orderItemId -> quantity selected (absent / 0 = not selected)
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reasonCode, setReasonCode] = useState<ReturnReason>(ReturnReason.DEFECTIVE);
  const [comment, setComment] = useState('');
  const [exchangeVariantId, setExchangeVariantId] = useState<string | null>(null);

  const remainingFor = (it: ReturnableItem) => it.quantity - (it.alreadyReturnedQty ?? 0);
  const selectedIds = Object.keys(selected).filter((id) => selected[id] > 0);
  const isExchange = type === ReturnType.EXCHANGE;
  // Exchange ships one replacement → constrain to a single item.
  const exchangeItem =
    isExchange && selectedIds.length === 1 ? items.find((i) => i.id === selectedIds[0]) : undefined;

  const toggleItem = (it: ReturnableItem) => {
    const remaining = remainingFor(it);
    if (remaining <= 0) return;
    setSelected((prev) => {
      const isOn = (prev[it.id] ?? 0) > 0;
      if (isExchange) {
        // single-select for exchange
        setExchangeVariantId(null);
        return isOn ? {} : { [it.id]: 1 };
      }
      const next = { ...prev };
      if (isOn) delete next[it.id];
      else next[it.id] = 1;
      return next;
    });
  };

  const setQty = (it: ReturnableItem, qty: number) => {
    const remaining = remainingFor(it);
    const clamped = Math.max(1, Math.min(qty, remaining));
    setSelected((prev) => ({ ...prev, [it.id]: clamped }));
  };

  const switchType = (next: ReturnType) => {
    setType(next);
    setExchangeVariantId(null);
    // Exchange can only carry one line — collapse any multi-selection.
    if (next === ReturnType.EXCHANGE && selectedIds.length > 1) {
      setSelected(selectedIds[0] ? { [selectedIds[0]]: 1 } : {});
    }
  };

  // Load sibling variants of the exchange item's product for the size/colour picker.
  const { data: product, isLoading: variantsLoading } = useQuery<{ variants: ProductVariant[] }>({
    queryKey: ['product-variants', exchangeItem?.productSlug],
    queryFn: () => api.get(`/products/${exchangeItem!.productSlug}`),
    enabled: isExchange && !!exchangeItem?.productSlug,
    staleTime: 60_000,
  });

  const replacementOptions = useMemo(() => {
    if (!product?.variants || !exchangeItem) return [];
    // Other variants of the same product (exclude the exact one being returned).
    return product.variants.filter((v) => v.id !== exchangeItem.variantId);
  }, [product, exchangeItem]);

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/orders/${orderNumber}/returns`, {
        type,
        reasonCode,
        comment: comment.trim() || undefined,
        items: selectedIds.map((id) => ({ orderItemId: id, quantity: selected[id] })),
        ...(isExchange && exchangeVariantId ? { exchangeVariantId } : {}),
      }),
    onSuccess: () => {
      addToast(
        isExchange ? 'Exchange requested — we’ll arrange a pickup' : 'Return requested',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['order', orderNumber] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      onClose();
    },
    onError: (err) => addToast(apiErrorMessage(err, 'Could not submit your return'), 'error'),
  });

  const canSubmit =
    selectedIds.length > 0 &&
    (!isExchange || (selectedIds.length === 1 && !!exchangeVariantId)) &&
    !submit.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return or exchange">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 0, border: '1px solid #E5E5E5', borderRadius: 4 }}>
          {[ReturnType.REFUND, ReturnType.EXCHANGE].map((t) => (
            <button
              key={t}
              onClick={() => switchType(t)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 1,
                background: type === t ? '#000' : 'transparent',
                color: type === t ? '#fff' : '#666',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t === ReturnType.REFUND ? 'REFUND' : 'EXCHANGE'}
            </button>
          ))}
        </div>
        {isExchange && (
          <p
            style={{ fontSize: 11, fontWeight: 300, color: '#666', lineHeight: 1.5, marginTop: -8 }}
          >
            Pick one item and a same-price size/colour. We’ll schedule a free pickup and ship the
            replacement automatically.
          </p>
        )}

        {/* Items */}
        <div>
          <p style={label}>SELECT ITEMS</p>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((it) => {
              const remaining = remainingFor(it);
              const isOn = (selected[it.id] ?? 0) > 0;
              const disabled = remaining <= 0;
              return (
                <div
                  key={it.id}
                  onClick={() => !disabled && toggleItem(it)}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 10,
                    border: `1px solid ${isOn ? '#000' : '#E5E5E5'}`,
                    borderRadius: 4,
                    alignItems: 'center',
                    opacity: disabled ? 0.45 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: `1px solid ${isOn ? '#000' : '#CCC'}`,
                      background: isOn ? '#000' : '#fff',
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{ width: 40, aspectRatio: '3/4', background: '#F5F5F5', flexShrink: 0 }}
                  >
                    {it.productImage && (
                      <img
                        src={getImageUrl(it.productImage, 120)}
                        alt={it.productName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>{it.productName}</p>
                    <p style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
                      {[it.variantSize && `Size ${it.variantSize}`, it.variantColor]
                        .filter(Boolean)
                        .join(' · ')}
                      {disabled ? ' · already returned' : ` · ${remaining} returnable`}
                    </p>
                  </div>
                  {isOn && remaining > 1 && !isExchange && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <button
                        onClick={() => setQty(it, (selected[it.id] ?? 1) - 1)}
                        style={stepBtn}
                      >
                        −
                      </button>
                      <span style={{ fontSize: 12, width: 16, textAlign: 'center' }}>
                        {selected[it.id]}
                      </span>
                      <button
                        onClick={() => setQty(it, (selected[it.id] ?? 1) + 1)}
                        style={stepBtn}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Exchange variant picker */}
        {isExchange && exchangeItem && (
          <div>
            <p style={label}>REPLACEMENT</p>
            {variantsLoading ? (
              <div style={{ marginTop: 10 }}>
                <Spinner />
              </div>
            ) : replacementOptions.length === 0 ? (
              <p style={{ marginTop: 10, fontSize: 11, fontWeight: 300, color: '#B45309' }}>
                No other size/colour is available for this product — choose a refund instead.
              </p>
            ) : (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {replacementOptions.map((v) => {
                  const oos = v.stock <= 0 || !v.isActive;
                  const picked = exchangeVariantId === v.id;
                  return (
                    <button
                      key={v.id}
                      disabled={oos}
                      onClick={() => setExchangeVariantId(v.id)}
                      style={{
                        padding: '8px 12px',
                        fontSize: 11,
                        fontWeight: 400,
                        border: `1px solid ${picked ? '#000' : '#E5E5E5'}`,
                        background: picked ? '#000' : '#fff',
                        color: oos ? '#CCC' : picked ? '#fff' : '#000',
                        textDecoration: oos ? 'line-through' : 'none',
                        borderRadius: 4,
                        cursor: oos ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {[v.size, v.color].filter(Boolean).join(' / ')}
                      {oos ? ' · sold out' : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Reason */}
        <div>
          <p style={label}>REASON</p>
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value as ReturnReason)}
            style={{
              marginTop: 8,
              width: '100%',
              padding: 10,
              border: '1px solid #E5E5E5',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 300,
              background: '#fff',
            }}
          >
            {Object.values(ReturnReason).map((r) => (
              <option key={r} value={r}>
                {REASON_LABELS[r] ?? r}
              </option>
            ))}
          </select>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note (optional)"
            rows={2}
            style={{
              marginTop: 8,
              width: '100%',
              padding: 10,
              border: '1px solid #E5E5E5',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 300,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={ghostBtn}>
            CANCEL
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => submit.mutate()}
            style={{
              ...primaryBtn,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {submit.isPending ? 'SUBMITTING…' : 'SUBMIT REQUEST'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const stepBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  border: '1px solid #E5E5E5',
  background: '#fff',
  fontSize: 14,
  cursor: 'pointer',
  borderRadius: 3,
};
const ghostBtn: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: 1,
  background: 'transparent',
  border: '1px solid #E5E5E5',
  cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: 1,
  background: '#000',
  color: '#fff',
  border: '1px solid #000',
};
