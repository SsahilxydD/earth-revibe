'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  homepageStoryStackContentSchema,
  type HomepageBlockRecord,
  type HomepageStoryStackContent,
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

const NEW_STACK: HomepageStoryStackContent = {
  name: '',
  avatarUrl: '',
  avatarPosition: '50% 50%',
  items: [{ imageUrl: '', kicker: '', headline: '', ctaLabel: '', ctaHref: '' }],
};

function parseStack(content: unknown): HomepageStoryStackContent | null {
  const result = homepageStoryStackContentSchema.safeParse(content);
  return result.success ? result.data : null;
}

/** Surface the first Zod issue as a human-readable toast. */
function toastFirstIssue(content: HomepageStoryStackContent): boolean {
  const result = homepageStoryStackContentSchema.safeParse(content);
  if (result.success) return true;
  const issue = result.error.issues[0];
  const where = issue.path.length ? ` (${issue.path.join(' → ')})` : '';
  toast.error(`${issue.message}${where}`);
  return false;
}

export function StoryStacksEditor({ blocks }: { blocks: HomepageBlockRecord[] }) {
  const stacks = blocks
    .filter((b) => b.type === 'STORY_STACK')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const createBlock = useCreateHomepageBlock();
  const reorderBlocks = useReorderHomepageBlocks();
  const [showNewForm, setShowNewForm] = useState(false);

  const handleSwap = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= stacks.length) return;
    const ids = stacks.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await reorderBlocks.mutateAsync(ids);
    } catch {
      toast.error('Failed to reorder');
    }
  };

  return (
    <div className="space-y-3">
      {stacks.length === 0 && !showNewForm && (
        <p className="rounded bg-stone-50 px-3 py-2 text-[12px] text-medium-gray">
          The storefront is showing its built-in destination stories. Add a destination here to take
          over.
        </p>
      )}

      {stacks.map((block, index) => (
        <StackCard
          key={block.id}
          block={block}
          index={index}
          total={stacks.length}
          onSwap={handleSwap}
          reordering={reorderBlocks.isPending}
        />
      ))}

      {showNewForm ? (
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-deep-earth">New destination</p>
          <StackForm
            initial={NEW_STACK}
            saving={createBlock.isPending}
            saveLabel="Create destination"
            onCancel={() => setShowNewForm(false)}
            onSave={async (content) => {
              if (!toastFirstIssue(content)) return;
              try {
                await createBlock.mutateAsync({ type: 'STORY_STACK', content });
                setShowNewForm(false);
                toast.success('Destination added — live on the storefront');
              } catch {
                toast.error('Failed to add destination');
              }
            }}
          />
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShowNewForm(true)}>
          <Plus size={13} />
          Add destination
        </Button>
      )}
    </div>
  );
}

function StackCard({
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
  const [expanded, setExpanded] = useState(false);
  const updateBlock = useUpdateHomepageBlock();
  const deleteBlock = useDeleteHomepageBlock();
  const content = parseStack(block.content);

  const handleDelete = async () => {
    if (!confirm(`Remove "${content?.name ?? 'this destination'}" from the homepage?`)) return;
    try {
      await deleteBlock.mutateAsync(block.id);
      toast.success('Destination removed');
    } catch {
      toast.error('Failed to remove destination');
    }
  };

  if (!content) {
    // Content no longer passes the schema (e.g. written by an older build).
    // The API already skips it publicly; let the admin clean it up.
    return (
      <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-[12px] text-red-600">
          This destination has unreadable content and is not shown on the storefront.
        </p>
        <Button size="sm" variant="danger" onClick={handleDelete} isLoading={deleteBlock.isPending}>
          Delete
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <div className="flex items-center gap-3 p-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-stone-100">
          {content.avatarUrl && (
            <Image src={content.avatarUrl} alt="" fill className="object-cover" sizes="44px" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-deep-earth">{content.name}</p>
          <p className="text-[11px] text-medium-gray">
            {content.items.length} {content.items.length === 1 ? 'story' : 'stories'}
            {!block.isActive && ' · hidden'}
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
          onClick={handleDelete}
          disabled={deleteBlock.isPending}
          className="flex items-center justify-center rounded-md border border-red-200 p-2 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
          title="Delete destination"
        >
          <Trash2 size={13} />
        </button>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-stone-50 transition-colors"
          title={expanded ? 'Collapse' : 'Edit'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 p-4">
          <StackForm
            initial={content}
            saving={updateBlock.isPending}
            saveLabel="Save destination"
            onSave={async (next) => {
              if (!toastFirstIssue(next)) return;
              try {
                await updateBlock.mutateAsync({ id: block.id, data: { content: next } });
                toast.success('Destination saved — live on the storefront');
              } catch {
                toast.error('Failed to save destination');
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

function StackForm({
  initial,
  saving,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: HomepageStoryStackContent;
  saving: boolean;
  saveLabel: string;
  onSave: (content: HomepageStoryStackContent) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<HomepageStoryStackContent>(() => structuredClone(initial));

  const setItem = (i: number, patch: Partial<HomepageStoryStackContent['items'][number]>) => {
    setDraft((d) => ({
      ...d,
      items: d.items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)),
    }));
  };

  const moveItem = (i: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? i - 1 : i + 1;
    setDraft((d) => {
      if (target < 0 || target >= d.items.length) return d;
      const items = [...d.items];
      [items[i], items[target]] = [items[target], items[i]];
      return { ...d, items };
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          label="Destination name"
          placeholder="Goa"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
        <Input
          label="Avatar crop (object-position)"
          placeholder="50% 20%"
          helperText="How the circle crops the avatar image"
          value={draft.avatarPosition}
          onChange={(e) => setDraft((d) => ({ ...d, avatarPosition: e.target.value }))}
        />
      </div>

      <div>
        <p className="mb-1 text-[13px] font-medium text-[#303030]">Avatar image</p>
        <ImagePicker
          value={draft.avatarUrl}
          onChange={(url) => setDraft((d) => ({ ...d, avatarUrl: url }))}
          frameClass="h-16 w-16 rounded-full"
        />
      </div>

      <div className="space-y-3">
        <p className="text-[13px] font-medium text-[#303030]">Stories</p>
        {draft.items.map((item, i) => (
          <div key={i} className="rounded-lg border border-stone-100 bg-stone-50/60 p-3">
            <div className="flex items-start gap-3">
              <ImagePicker
                value={item.imageUrl}
                onChange={(url) => setItem(i, { imageUrl: url })}
                frameClass="h-28 w-16"
              />
              <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
                <Input
                  label="Kicker"
                  placeholder="THE LINEN EDIT"
                  value={item.kicker}
                  onChange={(e) => setItem(i, { kicker: e.target.value })}
                />
                <Input
                  label="Headline"
                  placeholder="Shoreline mornings, zero effort."
                  value={item.headline}
                  onChange={(e) => setItem(i, { headline: e.target.value })}
                />
                <Input
                  label="Button label"
                  placeholder="Shop Beach Vibe"
                  value={item.ctaLabel}
                  onChange={(e) => setItem(i, { ctaLabel: e.target.value })}
                />
                <Input
                  label="Button link"
                  placeholder="/products?vibe=salt-on-skin"
                  value={item.ctaHref}
                  onChange={(e) => setItem(i, { ctaHref: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <button
                  onClick={() => moveItem(i, 'up')}
                  disabled={i === 0}
                  className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-white disabled:opacity-30 transition-colors"
                  title="Move up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => moveItem(i, 'down')}
                  disabled={i === draft.items.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-white disabled:opacity-30 transition-colors"
                  title="Move down"
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  onClick={() =>
                    setDraft((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }))
                  }
                  disabled={draft.items.length === 1}
                  className="flex h-6 w-6 items-center justify-center rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                  title="Remove story"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          disabled={draft.items.length >= 10}
          onClick={() =>
            setDraft((d) => ({
              ...d,
              items: [
                ...d.items,
                { imageUrl: '', kicker: '', headline: '', ctaLabel: '', ctaHref: '' },
              ],
            }))
          }
        >
          <Plus size={13} />
          Add story
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button size="sm" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="sm" isLoading={saving} onClick={() => onSave(draft)}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
