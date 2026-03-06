"use client";

import { useEffect, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores/ui-store";

const slides = [
  { title: "Essentials", bgImage: "/poster1.png", bgColor: "#97826F", href: "/products" },
  { title: "Luxe", bgImage: "/poster2.png", bgColor: "#8DB7AC", href: "/products" },
  { title: "Polos", bgImage: "/sample_product.png", bgColor: "#97826F", href: "/products" },
  { title: "Bottomwear", bgImage: "/poster3.png", bgColor: "#6D7B6E", href: "/categories/bottoms-pants" },
];

export function Hero() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Set header transparent on mount, restore on unmount
  useEffect(() => {
    useUIStore.getState().setHeaderTransparent(true);
    return () => {
      useUIStore.getState().setHeaderTransparent(false);
    };
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div className="h-full" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, index) => (
            <div
              key={index}
              className="relative flex-[0_0_100%] min-w-0 h-full"
              style={{ backgroundColor: slide.bgColor }}
            >
              {/* Background image */}
              <Image
                src={slide.bgImage}
                alt={slide.title}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="100vw"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />

              {/* Slide content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <AnimatePresence mode="wait">
                  {selectedIndex === index && (
                    <motion.div
                      key={`content-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="flex flex-col items-center"
                    >
                      <h1 className="text-[40px] lg:text-[72px] font-[var(--font-cinzel)] font-medium text-white tracking-[0.04em] mb-6">
                        {slide.title}
                      </h1>
                      <Link
                        href={slide.href}
                        className="inline-block border border-white text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:bg-white hover:text-black transition-colors duration-300"
                      >
                        Shop Now
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              selectedIndex === index
                ? "bg-white w-6"
                : "bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
