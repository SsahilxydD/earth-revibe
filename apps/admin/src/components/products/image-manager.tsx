"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, Star, Loader2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import {
  useUploadImage,
  useAddProductImage,
  useDeleteProductImage,
  useSetProductImagePrimary,
} from "@/hooks/use-products";

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

export function ImageManager({ productId, images }: ImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadImage = useUploadImage();
  const addImage = useAddProductImage();
  const deleteImage = useDeleteProductImage();
  const setPrimary = useSetProductImagePrimary();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      try {
        // Upload image (full quality to Supabase, thumbnail to Cloudflare if configured)
        const uploadResult = await uploadImage.mutateAsync(file);

        // Link to product
        await addImage.mutateAsync({
          productId,
          data: {
            url: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl,
            publicId: uploadResult.id,
            altText: file.name.replace(/\.[^/.]+$/, ""),
          },
        });
        successCount++;
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} image${successCount !== 1 ? "s" : ""} uploaded`);
    }

    setUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Delete this image?")) return;
    try {
      await deleteImage.mutateAsync(imageId);
      toast.success("Image deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete image");
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await setPrimary.mutateAsync(imageId);
      toast.success("Primary image updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to set primary image");
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-charcoal">Images</h3>
          <p className="text-xs text-medium-gray mt-0.5">
            {images.length} image{images.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImagePlus size={16} />
              Upload
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                image.isPrimary ? "border-forest-green" : "border-light-gray"
              }`}
            >
              <div className="aspect-square bg-off-white">
                <img
                  src={image.url}
                  alt={image.altText || "Product image"}
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
                    onClick={() => handleSetPrimary(image.id)}
                    disabled={setPrimary.isPending}
                    className="p-2 bg-white rounded-lg hover:bg-off-white transition-colors"
                    title="Set as primary"
                  >
                    <Star size={16} className="text-amber-500" />
                  </button>
                )}
                <button
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
      ) : (
        <div
          className="border-2 border-dashed border-light-gray rounded-lg p-8 text-center cursor-pointer hover:border-deep-earth/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus size={32} className="mx-auto text-medium-gray mb-2" />
          <p className="text-sm text-medium-gray">Click to upload product images</p>
          <p className="text-xs text-medium-gray mt-1">JPEG, PNG, WebP, GIF up to 10MB</p>
        </div>
      )}
    </Card>
  );
}
