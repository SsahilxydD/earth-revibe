'use client';

import { CreditCard, Banknote } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice } from '@/lib/utils';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrepaid: () => void;
  onSelectCOD: () => void;
}

export function PaymentMethodModal({
  isOpen,
  onClose,
  onSelectPrepaid,
  onSelectCOD,
}: PaymentMethodModalProps) {
  const getTotal = useCartStore((s) => s.getTotal);
  const total = getTotal();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Method" maxWidth="max-w-sm">
      <p className="mb-5 text-xs text-[var(--color-muted)]">
        Total: <span className="font-semibold text-[var(--color-text)]">{formatPrice(total)}</span>
      </p>

      <div className="space-y-3">
        <button
          onClick={() => {
            onClose();
            onSelectPrepaid();
          }}
          className="flex w-full items-center gap-4 rounded-lg border border-[var(--color-border)] p-4 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)]">
            <CreditCard size={18} />
          </div>
          <div>
            <p className="text-sm font-bold">Pay Online</p>
            <p className="text-[11px] text-[var(--color-muted)]">UPI, Cards, Netbanking, Wallets</p>
          </div>
        </button>

        <button
          onClick={() => {
            onClose();
            onSelectCOD();
          }}
          className="flex w-full items-center gap-4 rounded-lg border border-[var(--color-border)] p-4 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)]">
            <Banknote size={18} />
          </div>
          <div>
            <p className="text-sm font-bold">Cash on Delivery</p>
            <p className="text-[11px] text-[var(--color-muted)]">Pay when your order arrives</p>
          </div>
        </button>
      </div>
    </Modal>
  );
}
