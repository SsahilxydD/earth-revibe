"use client";

import { useRef } from "react";
import Image from "next/image";
import { Upload, Loader2, ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useHomepageSections, useUpdateHomepageSection } from "@/hooks/use-homepage";
import { useUploadImage } from "@/hooks/use-products";

export default function HomepagePage() {
  const { data: sections, isLoading } = useHomepageSections();
  const updateSection = useUpdateHomepageSection();
  const uploadImage = useUploadImage();

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = async (id: string, file: File) => {
    try {
      const result = await uploadImage.mutateAsync(file);
      await updateSection.mutateAsync({ id, data: { imageUrl: result.url } });
      toast.success("Image updated");
    } catch {
      toast.error("Failed to upload image");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-deep-earth">Homepage</h1>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-deep-earth">Homepage Sections</h1>
        <p className="text-sm text-medium-gray mt-1">
          Upload images for each category section. Images display full-bleed on the storefront.
        </p>
      </div>

      <div className="space-y-4">
        {(sections ?? []).map((section) => (
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
                {section.href}
                <ExternalLink size={11} />
              </a>
              {section.imageUrl && (
                <p className="text-xs text-green-600 mt-1">Image set</p>
              )}
            </div>

            {/* Upload button */}
            <div>
              <input
                ref={(el) => { fileInputRefs.current[section.id] = el; }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(section.id, file);
                  e.target.value = "";
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
                {section.imageUrl ? "Replace" : "Upload"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
