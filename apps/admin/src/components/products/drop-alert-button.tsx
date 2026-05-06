'use client';

import { useMemo, useState } from 'react';
import { Send, AlertTriangle, ImageOff } from 'lucide-react';
import { Button } from '@earth-revibe/ui/button';
import { Modal } from '@earth-revibe/ui/modal';
import { Input } from '@earth-revibe/ui/input';
import { Spinner } from '@earth-revibe/ui/spinner';
import { toast } from '@earth-revibe/ui/toast';
import { formatPrice } from '@earth-revibe/shared';
import { useProducts } from '@/hooks/use-products';
import {
  useDropAlertDryRun,
  useDispatchDropAlert,
  type DropAlertCard,
} from '@/hooks/use-drop-alert';
import type { Product } from '@/types';

interface DropAlertButtonProps {
  product: Product;
}

// MARKETING-category WhatsApp alert. Card 1 = the product the admin just
// edited (the "trigger" / featured drop). Cards 2 + 3 are auto-filled with
// the two most recent other ACTIVE products so the carousel always has the
// 3 cards the approved Meta template requires. See
// docs/plans/2026-05-06-new-drop-alerts-design.md.

function pickCardImage(product: Product): string | null {
  const primary = product.images.find((img) => img.isPrimary) ?? product.images[0];
  return primary ? primary.url : null;
}

function toCard(product: Product): DropAlertCard | null {
  const imageUrl = pickCardImage(product);
  if (!imageUrl) return null;
  return {
    imageUrl,
    productName: product.name,
    priceFormatted: formatPrice(product.price),
    productSlug: product.slug,
  };
}

export function DropAlertButton({ product }: DropAlertButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropName, setDropName] = useState(product.name);

  // Pull a small batch of recent ACTIVE products to fill cards 2 + 3.
  // limit:6 leaves headroom in case the trigger product or some lack images.
  const { data: recentData } = useProducts({
    limit: 6,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    status: 'ACTIVE',
  });

  const dryRun = useDropAlertDryRun(product.id, isOpen);
  const dispatch = useDispatchDropAlert();

  const cards = useMemo<DropAlertCard[]>(() => {
    const triggerCard = toCard(product);
    if (!triggerCard) return [];
    const recent: Product[] = recentData?.products ?? [];
    const fillers = recent
      .filter((p) => p.id !== product.id)
      .map(toCard)
      .filter((c): c is DropAlertCard => c !== null)
      .slice(0, 2);
    return [triggerCard, ...fillers];
  }, [product, recentData]);

  const cardsReady = cards.length === 3;
  const triggerImageMissing = !pickCardImage(product);

  const handleConfirm = async () => {
    if (!cardsReady) {
      toast.error('Need 3 products with images to send a drop alert');
      return;
    }
    if (!dropName.trim()) {
      toast.error('Drop name is required');
      return;
    }
    try {
      const result = await dispatch.mutateAsync({
        productId: product.id,
        dropName: dropName.trim(),
        cards,
      });
      toast.success(
        `Drop alert sent: ${result.notified} notified, ${result.failed} failed${
          result.skippedBudget ? `, ${result.skippedBudget} skipped (budget)` : ''
        }`
      );
      setIsOpen(false);
    } catch (err) {
      // api-client throws POJOs `{ status, code, message }`, not Error instances.
      const message = (err as { message?: string })?.message || 'Failed to send drop alert';
      toast.error(message);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <Send size={16} />
        Send drop alert
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => (dispatch.isPending ? undefined : setIsOpen(false))}
        title="Send drop alert"
        size="lg"
      >
        <div className="space-y-5">
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              Marketing-category WhatsApp send. Counts against the 500/day budget and the 7-day
              per-user frequency cap. This action cannot be undone.
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Drop name
            </label>
            <Input
              value={dropName}
              onChange={(e) => setDropName(e.target.value)}
              placeholder="e.g. Monsoon Drop 2026"
              className="mt-1"
              maxLength={60}
            />
            <p className="text-xs text-text-secondary mt-1">
              Shown in the message body. Defaults to the product name.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Carousel preview
            </p>
            {triggerImageMissing ? (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-error">
                This product has no image. Add a primary image before sending a drop alert.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {cards.map((card, idx) => (
                  <div
                    key={`${card.productSlug}-${idx}`}
                    className="border border-border rounded-md overflow-hidden bg-surface"
                  >
                    <div className="aspect-square bg-off-white relative">
                      <img
                        src={card.imageUrl}
                        alt={card.productName}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-primary text-text-on-dark rounded">
                          Trigger
                        </span>
                      )}
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {card.productName}
                      </p>
                      <p className="text-xs text-text-secondary">{card.priceFormatted}</p>
                    </div>
                  </div>
                ))}
                {!cardsReady && !triggerImageMissing && (
                  <div className="col-span-3 flex items-center gap-2 text-xs text-text-secondary">
                    <ImageOff size={14} />
                    Waiting for 2 more recent active products with images…
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-off-white px-4 py-3">
            {dryRun.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size="sm" /> Calculating recipients…
              </div>
            ) : dryRun.isError ? (
              <p className="text-sm text-error">Failed to load dry-run stats.</p>
            ) : dryRun.data ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-semibold text-text-primary">
                    {dryRun.data.willSendCount}
                  </p>
                  <p className="text-xs text-text-secondary uppercase tracking-wide mt-1">
                    Will send
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-text-primary">
                    {dryRun.data.eligibleCount}
                  </p>
                  <p className="text-xs text-text-secondary uppercase tracking-wide mt-1">
                    Eligible
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-text-primary">
                    {dryRun.data.budgetRemaining}
                  </p>
                  <p className="text-xs text-text-secondary uppercase tracking-wide mt-1">
                    Budget left
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={dispatch.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              isLoading={dispatch.isPending}
              disabled={
                !cardsReady ||
                !dropName.trim() ||
                dryRun.isLoading ||
                (dryRun.data?.willSendCount ?? 0) === 0
              }
            >
              <Send size={16} />
              Send to {dryRun.data?.willSendCount ?? '…'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
