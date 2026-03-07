'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { formatPrice } from '@earth-revibe/shared';

interface ProductCardProps {
  product: {
    name: string;
    slug: string;
    price: number | string;
    compareAtPrice?: number | string | null;
    images: { url: string; altText?: string | null }[];
    category?: { name: string } | null;
  };
  index?: number;
  sizes?: string[];
}

export function ProductCard({ product, index = 0, sizes }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hoverImageIndex, setHoverImageIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const containerWidth = useRef(0);

  const price = Number(product.price);
  const compareAtPrice = product.compareAtPrice != null ? Number(product.compareAtPrice) : null;
  const isOnSale = compareAtPrice !== null && compareAtPrice > price;
  const productImages = product.images?.map(img => img.url).slice(0, 6) || [];

  // Tutorial animation for first card
  useEffect(() => {
    if (index !== 0) return;
    const timer1 = setTimeout(() => setDragOffset(-70), 200);
    const timer2 = setTimeout(() => setDragOffset(0), 1200);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [index]);

  const goToSlide = (slideIndex: number) => {
    setCurrentSlide(Math.max(0, Math.min(slideIndex, productImages.length - 1)));
    setDragOffset(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    containerWidth.current = containerRef.current?.offsetWidth || 200;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    const width = containerWidth.current;
    if (currentSlide === 0 && diff > 0) { setDragOffset(0); return; }
    if (currentSlide === productImages.length - 1 && diff < 0) { setDragOffset(0); return; }
    setDragOffset(Math.max(-width, Math.min(width, diff)));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDistance = touchStartX.current - e.changedTouches[0].clientX;
    const touchDuration = Date.now() - touchStartTime.current;
    const width = containerWidth.current;
    const isQuickSwipe = touchDuration < 300 && Math.abs(touchDistance) > 50;
    const isDragSwipe = Math.abs(touchDistance) > width * 0.25;
    setIsDragging(false);
    setTimeout(() => {
      if (isQuickSwipe || isDragSwipe) {
        goToSlide(touchDistance > 0 ? currentSlide + 1 : currentSlide - 1);
      } else {
        setDragOffset(0);
      }
    }, 10);
  };

  // Desktop hover-based image switching (divide into zones)
  const desktopImages = productImages.slice(0, 4);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || desktopImages.length <= 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const zone = rect.width / desktopImages.length;
    const idx = Math.min(Math.floor(x / zone), desktopImages.length - 1);
    setHoverImageIndex(idx);
  };

  return (
    <div
      className="product-tile animate-[fadeUp_0.5s_ease-out_forwards]"
      style={{ animationDelay: `${index * 0.06}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoverImageIndex(0); }}
    >
      {/* Image Container */}
      <Link
        href={`/products/${product.slug}`}
        className="block relative aspect-[3/4] overflow-hidden bg-[#f4f4f4]"
      >
        <div
          ref={containerRef}
          className="h-full w-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
        >
          {/* Mobile: swipe carousel */}
          <div
            className="h-full flex md:hidden"
            style={{
              transform: `translateX(calc(-${currentSlide * 100}% + ${dragOffset}px))`,
              transition: isDragging ? 'none' : 'transform 0.4s ease-out',
            }}
          >
            {productImages.length > 0 ? (
              productImages.map((image, idx) => (
                <div key={idx} className="h-full flex-shrink-0 w-full relative">
                  <Image
                    src={image}
                    alt={`${product.name} - Image ${idx + 1}`}
                    fill
                    className="object-cover object-top"
                    sizes="50vw"
                    loading="lazy"
                  />
                </div>
              ))
            ) : (
              <div className="h-full flex-shrink-0 w-full flex items-center justify-center bg-[#f4f4f4]">
                <span className="text-[10px] text-slate-400">No Image</span>
              </div>
            )}
          </div>

          {/* Mobile slide indicator dots */}
          {productImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 md:hidden">
              {productImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentSlide ? 'bg-black' : 'bg-black/25'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Desktop: hover-based switching */}
          <div className="h-full hidden md:block relative">
            {desktopImages.length > 0 ? (
              desktopImages.map((image, idx) => (
                <Image
                  key={idx}
                  src={image}
                  alt={`${product.name} - Image ${idx + 1}`}
                  fill
                  className={`object-cover object-top transition-opacity duration-200 ${
                    idx === hoverImageIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                  sizes="25vw"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              ))
            ) : (
              <div className="h-full flex items-center justify-center bg-[#f4f4f4]">
                <span className="text-[10px] text-slate-400">No Image</span>
              </div>
            )}
            {/* Hover zone indicators */}
            {isHovered && desktopImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                {desktopImages.map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      idx === hoverImageIndex ? 'bg-black' : 'bg-black/25'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sale badge */}
        {isOnSale && (
          <span className="absolute top-2 left-2 z-20 bg-black text-white text-[9px] tracking-[0.1em] uppercase px-2 py-0.5">
            Sale
          </span>
        )}

        {/* Quick Add - desktop only, circle cart icon */}
        <div
          className={`hidden md:flex absolute bottom-2 right-2 z-10 w-9 h-9 bg-white items-center justify-center shadow-md cursor-pointer transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
      </Link>

      {/* Size chips */}
      {sizes && sizes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 px-1">
          {sizes.map((size) => (
            <span
              key={size}
              className="text-[9px] tracking-[0.04em] text-slate-500 border border-slate-200 px-1.5 py-0.5"
            >
              {size}
            </span>
          ))}
        </div>
      )}

      {/* Text Block */}
      <div style={{ marginTop: '10px', paddingLeft: '4px', paddingRight: '4px' }}>
        <div className="flex items-baseline justify-between gap-3">
          <Link href={`/products/${product.slug}`} className="min-w-0 flex-1">
            <p className="text-[12px] md:text-[13px] font-medium text-[#222] leading-[1.4] m-0">
              {product.name}
            </p>
          </Link>
          <span className="flex-shrink-0">
            {isOnSale ? (
              <>
                <span className="line-through text-slate-400 text-[11px]">{formatPrice(compareAtPrice!)}</span>
                <span className="text-[13px] font-semibold text-[#222] ml-1">{formatPrice(price)}</span>
              </>
            ) : (
              <span className="text-[13px] font-semibold text-[#222]">{formatPrice(price)}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
