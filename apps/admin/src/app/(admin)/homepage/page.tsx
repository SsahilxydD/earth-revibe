'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, Loader2, ExternalLink, Plus, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import {
  useHomepageSections,
  useUpdateHomepageSection,
  useCreateHomepageSection,
  useDeleteHomepageSection,
  useReorderHomepageSections,
} from '@/hooks/use-homepage';
import { useUploadImage } from '@/hooks/use-products';

export default function HomepagePage() {
  const { data: sections, isLoading } = useHomepageSections();
  const updateSection = useUpdateHomepageSection();
  const createSection = useCreateHomepageSection();
  const deleteSection = useDeleteHomepageSection();
  const reorderSections = useReorderHomepageSections();
  const uploadImage = useUploadImage();

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newHref, setNewHref] = useState('');

  const handleFileChange = async (id: string, file: File) => {
    try {
      const result = await uploadImage.mutateAsync(file);
      await updateSection.mutateAsync({ id, data: { imageUrl: result.url } });
      toast.success('Image updated');
    } catch {
      toast.error('Failed to upload image');
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim() || !newHref.trim()) {
      toast.error('Label and URL are required');
      return;
    }
    try {
      await createSection.mutateAsync({
        label: newLabel.trim().toUpperCase(),
        href: newHref.trim(),
        sortOrder: sections?.length ?? 0,
      });
      setNewLabel('');
      setNewHref('');
      setShowAddForm(false);
      toast.success('Section added');
    } catch {
      toast.error('Failed to add section');
    }
  };

  const handleSwap = async (index: number, direction: 'up' | 'down') => {
    if (!sections) return;
    const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap positions in the array
    const newOrder = sorted.map((s) => s.id);
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

    try {
      await reorderSections.mutateAsync(newOrder);
      toast.success('Order updated');
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Remove "${label}" from the homepage?`)) return;
    try {
      await deleteSection.mutateAsync(id);
      toast.success('Section removed');
    } catch {
      toast.error('Failed to remove section');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-deep-earth">Homepage</h1>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-deep-earth">Homepage Sections</h1>
          <p className="text-sm text-medium-gray mt-1">
            Upload full-bleed images for each section. Each links to a category on the storefront.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-md bg-deep-earth px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          Add Section
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-deep-earth">New Section</p>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-medium-gray hover:text-deep-earth"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-3">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. SHIRTS)"
              className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-deep-earth"
            />
            <input
              value={newHref}
              onChange={(e) => setNewHref(e.target.value)}
              placeholder="URL (e.g. /categories/shirts)"
              className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-deep-earth"
            />
            <button
              onClick={handleAdd}
              disabled={createSection.isPending}
              className="flex items-center gap-2 rounded bg-deep-earth px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {createSection.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Sections list */}
      <div className="space-y-4">
        {(sections ?? []).length === 0 && (
          <p className="text-sm text-medium-gray py-8 text-center">
            No sections yet. Add one above.
          </p>
        )}
        {[...(sections ?? [])]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((section, index, arr) => (
            <div
              key={section.id}
              className="flex items-center gap-4 rounded-lg border border-stone-200 bg-white p-4"
            >
              {/* Preview */}
              <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded bg-stone-100">
                {section.imageUrl ? (
                  <Image
                    src={section.imageUrl}
                    alt={section.label}
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-medium-gray">
                    No image
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-deep-earth">{section.label}</p>
                <a
                  href={section.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-medium-gray hover:text-deep-earth mt-0.5"
                >
                  {section.href} <ExternalLink size={11} />
                </a>
                {section.imageUrl && <p className="text-xs text-green-600 mt-1">Image set</p>}
              </div>

              {/* Reorder */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleSwap(index, 'up')}
                  disabled={index === 0 || reorderSections.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-stone-50 disabled:opacity-30 transition-colors"
                  title="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => handleSwap(index, 'down')}
                  disabled={index === arr.length - 1 || reorderSections.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-stone-50 disabled:opacity-30 transition-colors"
                  title="Move down"
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <input
                  ref={(el) => {
                    fileInputRefs.current[section.id] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(section.id, file);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => fileInputRefs.current[section.id]?.click()}
                  disabled={uploadImage.isPending || updateSection.isPending}
                  className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-deep-earth hover:bg-stone-50 disabled:opacity-50 transition-colors"
                >
                  {uploadImage.isPending || updateSection.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {section.imageUrl ? 'Replace' : 'Upload'}
                </button>
                <button
                  onClick={() => handleDelete(section.id, section.label)}
                  disabled={deleteSection.isPending}
                  className="flex items-center justify-center rounded-md border border-red-200 p-2 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
