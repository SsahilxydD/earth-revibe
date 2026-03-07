"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";

interface ImageGalleryProps {
  images: { url: string; altText?: string | null }[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
      setSelectedIndex(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] bg-[#f4f4f4] flex items-center justify-center">
        <span className="text-[11px] text-slate-400">No image available</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Main image carousel */}
      <div
        className="relative aspect-[3/4] bg-[#f4f4f4] overflow-hidden group cursor-crosshair"
        ref={emblaRef}
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <div className="flex h-full touch-pan-y">
          {images.map((image, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0 relative h-full">
              <Image
                src={image.url}
                alt={image.altText || "Product image"}
                fill
                className="object-cover transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, 50vw"
                style={
                  isZoomed && index === selectedIndex
                    ? { transform: "scale(1.5)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              aria-label="Previous image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              aria-label="Next image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Mobile dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 lg:hidden">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className="flex items-center justify-center w-6 h-6 min-h-[44px]"
                aria-label={`Go to image ${index + 1}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === selectedIndex ? "bg-black" : "bg-black/30"
                }`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop thumbnails */}
      {images.length > 1 && (
        <div className="hidden lg:flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`shrink-0 w-14 h-[72px] overflow-hidden border transition-colors relative ${
                index === selectedIndex ? "border-black" : "border-transparent hover:border-slate-300"
              }`}
            >
              <Image src={image.url} alt={image.altText || ""} fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
