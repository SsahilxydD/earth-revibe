'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_VIBE_CARDS,
  VIBES,
  homepageVibeCardContentSchema,
  type HomepageBlockRecord,
  type HomepageVibeCardContent,
  type Vibe,
} from '@earth-revibe/shared';
import { Button, Input } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import {
  useCreateHomepageBlock,
  useDeleteHomepageBlock,
  useReorderHomepageBlocks,
  useUpdateHomepageBlock,
} from '@/hooks/use-homepage';
import { ImagePicker } from './image-picker';
import { resolvePreviewUrl } from './preview-url';

// Suggested display labels for vibes added beyond the defaults — same
// phrasing as the /products vibe filter row so homepage cards and filter
// chips tell one story. Admin can override.
const SUGGESTED_LABELS: Record<Vibe, string> = {
  'above-the-clouds': 'Mountain Vibe',
  'salt-on-skin': 'Beach Vibe',
  'golden-hour-gang': 'Wild Vibe',
  'into-the-wild': 'Outdoors',
  'neon-nomads': 'Night Out',
};

function parseCard(content: unknown): HomepageVibeCardContent | null {
  const result = homepageVibeCardContentSchema.safeParse(content);
  return result.success ? result.data : null;
}

export function VibeCardsEditor({ blocks }: { blocks: HomepageBlockRecord[] }) {
  const cardBlocks = blocks
    .filter((b) => b.type === 'VIBE_CARD')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // The storefront renders the built-in defaults until the CMS has cards,
  // so an empty CMS shows those defaults here — as what's actually live —
  // with a one-click import that copies them in for editing.
  if (cardBlocks.length === 0) {
    return <ImportDefaultsView />;
  }

  return <LiveCardsView cardBlocks={cardBlocks} />;
}

// ---------------------------------------------------------------------------
// Empty CMS: mirror the live built-in cards + import action
// ---------------------------------------------------------------------------

function ImportDefaultsView() {
  const createBlock = useCreateHomepageBlock();
  const [importing, setImporting] = useState(false);

  const importDefaults = async () => {
    setImporting(true);
    try {
      // Sequential on purpose: block sortOrder is assigned max+1 per type,
      // so parallel creates would race and scramble the card order.
      for (const card of DEFAULT_VIBE_CARDS) {
        await createBlock.mutateAsync({
          type: 'VIBE_CARD',
          content: { label: card.label, vibe: card.vibe, imageUrl: card.imageUrl },
        });
      }
      toast.success('Cards imported — you can now edit them');
    } catch {
      toast.error('Import failed partway — the cards created so far are editable below');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
      <p className="text-[12px] text-medium-gray">
        These are the storefront&rsquo;s built-in cards, shown because none have been customised
        yet. Import them to start editing — the homepage won&rsquo;t change until you do.
      </p>

      {DEFAULT_VIBE_CARDS.map((card) => (
        <div
          key={card.vibe}
          className="flex items-center gap-4 rounded-lg border border-stone-100 bg-stone-50/60 p-3"
        >
          <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded bg-stone-100">
            <Image
              src={resolvePreviewUrl(card.imageUrl)}
              alt=""
              fill
              className="object-cover"
              sizes="72px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-deep-earth">{card.label}</p>
            <p className="text-[11px] text-medium-gray">Links to /products?vibe={card.vibe}</p>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-green-700">
            LIVE · BUILT-IN
          </span>
        </div>
      ))}

      <div className="flex justify-end">
        <Button size="sm" isLoading={importing} onClick={importDefaults}>
          <Download size={13} />
          Import these {DEFAULT_VIBE_CARDS.length} cards to start editing
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CMS populated: editable live cards + collapsed "add another vibe"
// ---------------------------------------------------------------------------

function LiveCardsView({ cardBlocks }: { cardBlocks: HomepageBlockRecord[] }) {
  const reorderBlocks = useReorderHomepageBlocks();
  const [showMore, setShowMore] = useState(false);

  const usedVibes = new Set(
    cardBlocks.map((b) => parseCard(b.content)?.vibe).filter(Boolean) as Vibe[]
  );
  const missingVibes = VIBES.filter((v) => !usedVibes.has(v));
  const activeCount = cardBlocks.filter((b) => b.isActive).length;

  const handleSwap = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= cardBlocks.length) return;
    const ids = cardBlocks.map((b) => b.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await reorderBlocks.mutateAsync(ids);
    } catch {
      toast.error('Failed to reorder');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-medium-gray">
        {activeCount} of {cardBlocks.length} card{cardBlocks.length === 1 ? '' : 's'} live on the
        homepage.
      </p>

      {cardBlocks.map((block, index) => (
        <VibeCardRow
          key={block.id}
          block={block}
          index={index}
          total={cardBlocks.length}
          onSwap={handleSwap}
          reordering={reorderBlocks.isPending}
        />
      ))}

      {missingVibes.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowMore((s) => !s)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-medium-gray hover:text-deep-earth transition-colors"
          >
            {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Add another vibe ({missingVibes.length} available)
          </button>
          {showMore && (
            <div className="mt-3 space-y-3">
              {missingVibes.map((vibe) => (
                <NewVibeCardRow key={vibe} vibe={vibe} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VibeCardRow({
  block,
  index,
  total,
  onSwap,
  reordering,
}: {
  block: HomepageBlockRecord;
  index: number;
  total: number;
  onSwap: (index: number, direction: 'up' | 'down') => void;
  reordering: boolean;
}) {
  const content = parseCard(block.content);
  const updateBlock = useUpdateHomepageBlock();
  const deleteBlock = useDeleteHomepageBlock();

  const [label, setLabel] = useState(content?.label ?? '');
  const [imageUrl, setImageUrl] = useState(content?.imageUrl ?? '');
  // Resync local edits when the row changes server-side (another save/tab);
  // keyed to updatedAt so in-progress typing isn't clobbered by refetches.
  useEffect(() => {
    setLabel(content?.label ?? '');
    setImageUrl(content?.imageUrl ?? '');
  }, [block.updatedAt]);

  if (!content) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-[12px] text-red-600">
          This vibe card has unreadable content and is not shown on the storefront.
        </p>
        <Button
          size="sm"
          variant="danger"
          isLoading={deleteBlock.isPending}
          onClick={() => deleteBlock.mutate(block.id)}
        >
          Delete
        </Button>
      </div>
    );
  }

  const dirty = label !== content.label || imageUrl !== content.imageUrl;

  const save = async () => {
    if (!label.trim() || !imageUrl) {
      toast.error('Label and image are required');
      return;
    }
    try {
      await updateBlock.mutateAsync({
        id: block.id,
        data: { content: { ...content, label: label.trim(), imageUrl } },
      });
      toast.success('Vibe card saved — live on the storefront');
    } catch {
      toast.error('Failed to save vibe card');
    }
  };

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border bg-white p-3 ${
        block.isActive ? 'border-stone-200' : 'border-stone-200 opacity-60'
      }`}
    >
      <ImagePicker value={imageUrl} onChange={setImageUrl} frameClass="h-24 w-[72px]" />
      <div className="min-w-0 flex-1 space-y-1">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Beach Vibe" />
        <p className="text-[11px] text-medium-gray">
          Links to /products?vibe={content.vibe}
          {!block.isActive && ' · hidden from homepage'}
        </p>
      </div>
      <button
        onClick={() => updateBlock.mutate({ id: block.id, data: { isActive: !block.isActive } })}
        disabled={updateBlock.isPending}
        className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-stone-50 disabled:opacity-30 transition-colors"
        title={block.isActive ? 'Hide from storefront' : 'Show on storefront'}
      >
        {block.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onSwap(index, 'up')}
          disabled={index === 0 || reordering}
          className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-stone-50 disabled:opacity-30 transition-colors"
          title="Move up"
        >
          <ArrowUp size={12} />
        </button>
        <button
          onClick={() => onSwap(index, 'down')}
          disabled={index === total - 1 || reordering}
          className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-stone-50 disabled:opacity-30 transition-colors"
          title="Move down"
        >
          <ArrowDown size={12} />
        </button>
      </div>
      <button
        onClick={() => {
          if (confirm(`Remove the "${content.label}" card from the homepage?`)) {
            deleteBlock.mutate(block.id);
          }
        }}
        disabled={deleteBlock.isPending}
        className="flex items-center justify-center rounded-md border border-red-200 p-2 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
        title="Delete card"
      >
        <Trash2 size={13} />
      </button>
      <Button size="sm" isLoading={updateBlock.isPending} disabled={!dirty} onClick={save}>
        Save
      </Button>
    </div>
  );
}

function NewVibeCardRow({ vibe }: { vibe: Vibe }) {
  const createBlock = useCreateHomepageBlock();
  const [label, setLabel] = useState(SUGGESTED_LABELS[vibe]);
  const [imageUrl, setImageUrl] = useState('');

  const add = async () => {
    if (!label.trim() || !imageUrl) {
      toast.error('Label and image are required');
      return;
    }
    try {
      await createBlock.mutateAsync({
        type: 'VIBE_CARD',
        content: { vibe, label: label.trim(), imageUrl },
      });
      toast.success('Vibe card added — live on the storefront');
    } catch {
      toast.error('Failed to add vibe card');
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-dashed border-stone-300 bg-stone-50/50 p-3">
      <ImagePicker value={imageUrl} onChange={setImageUrl} frameClass="h-24 w-[72px]" />
      <div className="min-w-0 flex-1 space-y-1">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        <p className="text-[11px] text-medium-gray">Links to /products?vibe={vibe}</p>
      </div>
      <Button size="sm" variant="secondary" isLoading={createBlock.isPending} onClick={add}>
        Add to homepage
      </Button>
    </div>
  );
}
