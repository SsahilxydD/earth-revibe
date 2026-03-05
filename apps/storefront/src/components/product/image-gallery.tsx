"use client";

import { useState } from "react";

interface ImageGalleryProps {
  images: { url: string; altText?: string | null }[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex] || { url: "/placeholder.jpg", altText: "Product" };

  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] bg-off-white rounded-xl flex items-center justify-center text-medium-gray">
        No image available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-[3/4] bg-off-white rounded-xl overflow-hidden group cursor-zoom-in">
        <img
          src={selectedImage.url}
          alt={selectedImage.altText || "Product image"}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors snap-start ${
                index === selectedIndex ? "border-forest-green" : "border-transparent hover:border-sage"
              }`}
            >
              <img src={image.url} alt={image.altText || ""} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
