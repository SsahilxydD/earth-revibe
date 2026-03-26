'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  ImagePlus,
  Trash2,
  Star,
  Loader2,
  X,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Upload,
  Link,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import {
  useUploadImage,
  useUploadImageFromUrl,
  useAddProductImage,
  useDeleteProductImage,
  useSetProductImagePrimary,
} from '@/hooks/use-products';

interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  publicId: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

interface ImageManagerProps {
  productId: string;
  images: ProductImage[];
}

// ── Per-file upload tracking ────────────────────────────────────────────────

type FileStatus = 'queued' | 'uploading' | 'done' | 'error';

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: FileStatus;
  error?: string;
}

// ── Concurrent upload engine ────────────────────────────────────────────────

const MAX_CONCURRENT = 3;

/**
 * Process items through a worker pool with bounded concurrency.
 * `onProcess` is called for each item; `onUpdate` fires after each completes.
 */
async function runConcurrent<T>(
  items: T[],
  onProcess: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await onProcess(item);
    }
  });
  await Promise.allSettled(workers);
}

// ── Component ───────────────────────────────────────────────────────────────

export function ImageManager({ productId, images }: ImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlUploading, setUrlUploading] = useState(false);

  const uploadImage = useUploadImage();
  const uploadFromUrl = useUploadImageFromUrl();
  const addImage = useAddProductImage();
  const deleteImage = useDeleteProductImage();
  const setPrimary = useSetProductImagePrimary();

  // Keep a ref to the latest queue so the unmount cleanup reads current state
  const uploadQueueRef = useRef(uploadQueue);
  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
  }, [uploadQueue]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      uploadQueueRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, []);

  // ── Upload a single file ────────────────────────────────────────────────

  const processOneFile = useCallback(
    async (item: UploadItem) => {
      // Mark uploading
      setUploadQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' as const } : q))
      );

      try {
        // 1. Upload to storage (Supabase + optional Cloudflare)
        const uploadResult = await uploadImage.mutateAsync(item.file);

        // 2. Link to product
        await addImage.mutateAsync({
          productId,
          data: {
            url: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl,
            publicId: uploadResult.id,
            altText: item.file.name.replace(/\.[^/.]+$/, ''),
          },
        });

        // Mark done
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'done' as const } : q))
        );
      } catch (err: any) {
        // Mark error
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'error' as const,
                  error: err.message || 'Upload failed',
                }
              : q
          )
        );
      }
    },
    [uploadImage, addImage, productId]
  );

  // ── Start processing the queue ──────────────────────────────────────────

  const processQueue = useCallback(
    async (items: UploadItem[]) => {
      setIsProcessing(true);

      const queued = items.filter((i) => i.status === 'queued');
      await runConcurrent(queued, processOneFile, MAX_CONCURRENT);

      setIsProcessing(false);

      // Show summary toast
      setUploadQueue((prev) => {
        const doneCount = prev.filter((i) => i.status === 'done').length;
        const errorCount = prev.filter((i) => i.status === 'error').length;
        if (doneCount > 0) {
          toast.success(`${doneCount} image${doneCount !== 1 ? 's' : ''} uploaded`);
        }
        if (errorCount > 0) {
          toast.error(`${errorCount} image${errorCount !== 1 ? 's' : ''} failed — retry below`);
        }
        return prev;
      });
    },
    [processOneFile]
  );

  // ── Add files to queue and start ────────────────────────────────────────

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Validate
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 100 * 1024 * 1024; // 100 MB

      const valid: File[] = [];
      for (const f of fileArray) {
        if (!allowed.includes(f.type)) {
          toast.error(`${f.name}: unsupported format (use JPEG, PNG, WebP, GIF)`);
          continue;
        }
        if (f.size > maxSize) {
          toast.error(`${f.name}: exceeds 100 MB limit`);
          continue;
        }
        valid.push(f);
      }

      if (valid.length === 0) return;

      const newItems: UploadItem[] = valid.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'queued' as const,
      }));

      setUploadQueue((prev) => {
        const next = [...prev, ...newItems];
        // Start processing (fire-and-forget, state managed internally)
        processQueue(next);
        return next;
      });
    },
    [processQueue]
  );

  // ── Retry a failed upload ───────────────────────────────────────────────

  const retryOne = useCallback(
    (id: string) => {
      setUploadQueue((prev) => {
        const next = prev.map((q) =>
          q.id === id ? { ...q, status: 'queued' as const, error: undefined } : q
        );
        // Re-process just the retried item
        const retryItem = next.find((q) => q.id === id);
        if (retryItem) {
          processQueue([retryItem]);
        }
        return next;
      });
    },
    [processQueue]
  );

  // ── Remove an item from upload queue ────────────────────────────────────

  const removeFromQueue = useCallback((id: string) => {
    setUploadQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((q) => q.id !== id);
    });
  }, []);

  // ── Clear completed/errored from queue ──────────────────────────────────

  const clearFinished = useCallback(() => {
    setUploadQueue((prev) => {
      const toRemove = prev.filter((q) => q.status === 'done' || q.status === 'error');
      toRemove.forEach((item) => URL.revokeObjectURL(item.preview));
      return prev.filter((q) => q.status !== 'done' && q.status !== 'error');
    });
  }, []);

  // ── URL upload handler ─────────────────────────────────────────────────

  const handleUrlUpload = useCallback(async () => {
    const trimmed = urlValue.trim();
    if (!trimmed) return;

    try {
      new URL(trimmed);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setUrlUploading(true);
    try {
      const result = await uploadFromUrl.mutateAsync(trimmed);

      await addImage.mutateAsync({
        productId,
        data: {
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          publicId: result.id,
          altText:
            trimmed
              .split('/')
              .pop()
              ?.replace(/\.[^/.]+$/, '') || 'Image',
        },
      });

      toast.success('Image uploaded from URL');
      setUrlValue('');
      setShowUrlInput(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload from URL');
    } finally {
      setUrlUploading(false);
    }
  }, [urlValue, uploadFromUrl, addImage, productId]);

  // ── File input handler ──────────────────────────────────────────────────

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
      // Reset so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addFiles]
  );

  // ── Drag & drop handlers ────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  // ── Existing image actions ──────────────────────────────────────────────

  const handleDelete = async (imageId: string) => {
    if (!confirm('Delete this image?')) return;
    try {
      await deleteImage.mutateAsync(imageId);
      toast.success('Image deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete image');
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await setPrimary.mutateAsync(imageId);
      toast.success('Primary image updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to set primary image');
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────

  const hasQueueItems = uploadQueue.length > 0;
  const hasFinished = uploadQueue.some((q) => q.status === 'done' || q.status === 'error');
  const doneCount = uploadQueue.filter((q) => q.status === 'done').length;
  const totalInQueue = uploadQueue.length;
  const activeCount = uploadQueue.filter((q) => q.status === 'uploading').length;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-charcoal">Images</h3>
          <p className="text-xs text-medium-gray mt-0.5">
            {images.length} image{images.length !== 1 ? 's' : ''} saved
            {hasQueueItems && (
              <span className="ml-1.5">
                &middot; {doneCount}/{totalInQueue} uploaded
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasFinished && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFinished}>
              Clear queue
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput((v) => !v)}
            disabled={urlUploading}
          >
            <Link size={16} />
            URL
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading ({activeCount})...
              </>
            ) : (
              <>
                <ImagePlus size={16} />
                Upload
              </>
            )}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* URL input */}
      {showUrlInput && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUrlUpload();
              }
            }}
            placeholder="https://example.com/image.jpg"
            disabled={urlUploading}
            className="flex-1 rounded-lg border border-light-gray bg-off-white px-3 py-2 text-sm text-charcoal placeholder:text-medium-gray focus:border-deep-earth focus:outline-none disabled:opacity-50"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUrlUpload}
            disabled={urlUploading || !urlValue.trim()}
          >
            {urlUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {urlUploading ? 'Fetching...' : 'Fetch'}
          </Button>
        </div>
      )}

      {/* Upload queue — per-file progress */}
      {hasQueueItems && (
        <div className="mb-4 space-y-2">
          {/* Progress bar */}
          <div className="h-1.5 bg-light-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-forest-green transition-all duration-300 rounded-full"
              style={{
                width: `${totalInQueue > 0 ? (doneCount / totalInQueue) * 100 : 0}%`,
              }}
            />
          </div>

          {/* File thumbnails */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="relative rounded-lg overflow-hidden border border-light-gray bg-off-white"
              >
                <div className="aspect-square">
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className={`w-full h-full object-cover transition-opacity ${
                      item.status === 'uploading' ? 'opacity-50' : ''
                    } ${item.status === 'error' ? 'opacity-40' : ''}`}
                  />
                </div>

                {/* Status overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {item.status === 'queued' && (
                    <span className="bg-charcoal/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                      Queued
                    </span>
                  )}
                  {item.status === 'uploading' && (
                    <Loader2 size={20} className="text-deep-earth animate-spin" />
                  )}
                  {item.status === 'done' && (
                    <CheckCircle size={20} className="text-forest-green" />
                  )}
                  {item.status === 'error' && (
                    <div className="flex flex-col items-center gap-1">
                      <AlertCircle size={18} className="text-error" />
                      <button
                        type="button"
                        onClick={() => retryOne(item.id)}
                        className="bg-white/90 text-charcoal text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5 hover:bg-white transition-colors"
                      >
                        <RotateCcw size={10} />
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                {/* Remove button (visible for queued, done, error) */}
                {item.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => removeFromQueue(item.id)}
                    className="absolute top-1 right-1 bg-charcoal/60 hover:bg-charcoal/80 text-white rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}

                {/* Filename */}
                <p className="text-[9px] text-medium-gray truncate px-1 py-0.5">{item.file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing images grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                image.isPrimary ? 'border-forest-green' : 'border-light-gray'
              }`}
            >
              <div className="aspect-square bg-off-white">
                <img
                  src={image.url}
                  alt={image.altText || 'Product image'}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Primary badge */}
              {image.isPrimary && (
                <span className="absolute top-2 left-2 bg-forest-green text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(image.id)}
                    disabled={setPrimary.isPending}
                    className="p-2 bg-white rounded-lg hover:bg-off-white transition-colors"
                    title="Set as primary"
                  >
                    <Star size={16} className="text-amber-500" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  disabled={deleteImage.isPending}
                  className="p-2 bg-white rounded-lg hover:bg-off-white transition-colors"
                  title="Delete image"
                >
                  <Trash2 size={16} className="text-error" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !hasQueueItems ? (
        /* Drop zone — only shown when no images and no queue */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-deep-earth bg-deep-earth/5'
              : 'border-light-gray hover:border-deep-earth/40'
          }`}
        >
          <Upload
            size={32}
            className={`mx-auto mb-2 transition-colors ${
              dragOver ? 'text-deep-earth' : 'text-medium-gray'
            }`}
          />
          <p className="text-sm text-medium-gray">
            {dragOver ? 'Drop images here' : 'Drag & drop images or click to upload'}
          </p>
          <p className="text-xs text-medium-gray mt-1">
            JPEG, PNG, WebP, GIF up to 100 MB &middot; Upload multiple at once
          </p>
        </div>
      ) : null}

      {/* Drop zone overlay for when images already exist */}
      {images.length > 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-3 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-deep-earth bg-deep-earth/5'
              : 'border-light-gray hover:border-deep-earth/40'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-xs text-medium-gray">
            {dragOver ? 'Drop images here' : 'Drag & drop more images or click to upload'}
          </p>
        </div>
      )}
    </Card>
  );
}
