"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn, BLUR_DATA_URL } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Slide {
  heading: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
}

const SLIDES: Slide[] = [
  {
    heading: "DEFINE YOUR STYLE",
    subtitle: "New collection just dropped",
    cta: "SHOP NOW",
    href: "/categories/new-arrivals",
    image: "/poster1.png",
  },
  {
    heading: "OVERSIZED IS THE NEW COOL",
    subtitle: "Comfort meets crazy",
    cta: "EXPLORE",
    href: "/categories/outerwear",
    image: "/poster2.png",
  },
  {
    heading: "UPTO 50% OFF",
    subtitle: "End of season sale",
    cta: "SHOP SALE",
    href: "/products",
    image: "/poster3.png",
  },
];

const AUTO_ROTATE_MS = 5000;

export function Hero() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[current];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <section className="relative w-full h-[60dvh] md:h-[calc(100dvh-80px)] overflow-hidden bg-[var(--color-primary)]">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.heading}
            fill
            priority={current === 0}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40" />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-none"
            >
              {slide.heading}
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-3 md:mt-5 text-sm sm:text-base md:text-lg text-white/80 tracking-wider uppercase"
            >
              {slide.subtitle}
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Link
                href={slide.href}
                className={cn(
                  "mt-6 md:mt-8 inline-block px-8 py-3 md:px-10 md:py-4",
                  "bg-white text-[var(--color-primary)] text-xs md:text-sm font-semibold",
                  "uppercase tracking-[0.15em]",
                  "rounded-[var(--button-radius)]",
                  "hover:bg-white/90 transition-colors",
                )}
              >
                {slide.cta}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dot navigation */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === current
                ? "w-8 bg-white"
                : "w-2 bg-white/50 hover:bg-white/70",
            )}
          />
        ))}
      </div>
    </section>
  );
}
