'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Loader2, Upload } from 'lucide-react';
import { toast } from '@earth-revibe/ui/toast';
import { useUploadImage } from '@/hooks/use-products';

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  /** Tailwind classes for the preview frame, e.g. "h-24 w-40" or "h-16 w-16 rounded-full". */
  frameClass?: string;
  disabled?: boolean;
}

/**
 * Preview + upload button for a single CMS image. Uploads go through the
 * existing /upload/image endpoint (Cloudflare Images; API auto-compresses
 * to <1MB WebP) and hand back the CDN URL.
 */
export function ImagePicker({
  value,
  onChange,
  frameClass = 'h-24 w-40',
  disabled,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadImage = useUploadImage();

  const handleFile = async (file: File) => {
    try {
      const result = await uploadImage.mutateAsync(file);
      onChange(result.url);
    } catch {
      toast.error('Failed to upload image');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`relative shrink-0 overflow-hidden rounded bg-stone-100 ${frameClass}`}>
        {value ? (
          <Image src={value} alt="" fill className="object-cover" sizes="160px" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-medium-gray">
            No image
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploadImage.isPending}
        className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-[12px] font-medium text-deep-earth hover:bg-stone-50 disabled:opacity-50 transition-colors"
      >
        {uploadImage.isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Upload size={13} />
        )}
        {value ? 'Replace' : 'Upload'}
      </button>
    </div>
  );
}
