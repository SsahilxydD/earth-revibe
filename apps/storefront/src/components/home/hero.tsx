'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/ui-store';

const heroSections = [
  {
    id: 'default-1',
    titleAccent: 'Essentials',
    bgColor: '#97826F',
    bgImage: '/poster1.png',
    gradientColor: '#8B6234',
    href: '/products',
  },
  {
    id: 'default-2',
    titleAccent: 'Luxe',
    bgColor: '#8DB7AC',
    bgImage: '/poster2.png',
    gradientColor: '#EAD9CC',
    href: '/products',
  },
  {
    id: 'default-3',
    titleAccent: 'Polos',
    bgColor: '#97826F',
    bgImage: '/sample_product.png',
    gradientColor: '#8A8C80',
    href: '/products',
  },
  {
    id: 'default-4',
    titleAccent: 'Bottomwear',
    bgColor: '#6D7B6E',
    bgImage: '/poster3.png',
    gradientColor: '#8A8C80',
    href: '/categories/bottoms-pants',
  },
];

export function Hero() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { setHeaderTransparent } = useUIStore();

  useEffect(() => {
    setHeaderTransparent(true);
    return () => setHeaderTransparent(false);
  }, [setHeaderTransparent]);

  const getWidth = (index: number) => {
    const defaultWidth = 100 / heroSections.length;
    if (hoveredIndex === null) return defaultWidth;
    if (hoveredIndex === index) return 55;
    return 45 / (heroSections.length - 1);
  };

  return (
    <div ref={heroRef}>
      {/* Mobile: Full Screen Stacked Layout */}
      <div className="lg:hidden flex flex-col gap-[4px] bg-[#FDFCFA]">
        {heroSections.map((section, index) => (
          <section
            key={section.id}
            className="relative h-screen w-full overflow-hidden"
            style={{ backgroundColor: section.bgColor }}
          >
            <Link
              href={section.href}
              className="absolute inset-0 z-30"
              aria-label={`Shop ${section.titleAccent}`}
              prefetch={false}
            />

            <Image
              src={section.bgImage}
              alt={section.titleAccent}
              fill
              sizes="100vw"
              className="object-cover object-center"
              priority={index === 0}
            />

            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, ${section.gradientColor}cc 0%, ${section.gradientColor}33 25%, transparent 50%)`
              }}
            />

            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
              <motion.div
                className="absolute top-[55%] -translate-y-1/2"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                viewport={{ once: true, amount: 0.5 }}
              >
                <h1 className="font-[var(--font-display)] text-5xl sm:text-6xl font-normal text-white drop-shadow-lg">
                  {section.titleAccent}
                </h1>
              </motion.div>

              <motion.div
                className="absolute top-[82%]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true, amount: 0.5 }}
              >
                <span className="inline-flex items-center justify-center w-[100px] h-[40px] border-2 border-white text-white text-sm tracking-[0.15em] font-medium transition-all duration-300 backdrop-blur-sm bg-white/10">
                  Shop Now
                </span>
              </motion.div>
            </div>
          </section>
        ))}
      </div>

      {/* Desktop: Interactive Row Layout */}
      <div
        className="hidden lg:flex h-screen bg-[#FDFCFA]"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {heroSections.map((section, index) => (
          <motion.div
            key={section.id}
            className="relative h-full overflow-hidden bg-black"
            animate={{ width: `${getWidth(index)}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }}
            onMouseEnter={() => setHoveredIndex(index)}
          >
            <Link
              href={section.href}
              className="absolute inset-0 z-10"
              aria-label={`Shop ${section.titleAccent}`}
              prefetch={false}
            />

            <motion.div
              className="h-full w-full relative"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="h-full w-full relative"
                animate={{ scale: hoveredIndex === index ? 1.1 : 1 }}
                style={{
                  transformOrigin: section.titleAccent === 'Bottomwear'
                    ? 'center 85%'
                    : 'center 30%',
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Image
                  src={section.bgImage}
                  alt={section.titleAccent}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  style={{
                    objectPosition: section.titleAccent === 'Bottomwear'
                      ? 'center 85%'
                      : 'center 30%',
                  }}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </motion.div>

              <motion.div
                className="absolute inset-0 bg-black"
                animate={{
                  opacity: hoveredIndex === null ? 0 : hoveredIndex === index ? 0 : 0.3
                }}
                transition={{ duration: 0.3 }}
              />

              <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
                <motion.div
                  className="origin-bottom-left will-change-transform"
                  animate={{
                    scale: hoveredIndex === index ? 2.286 : 1,
                    opacity: hoveredIndex === null ? 1 : hoveredIndex === index ? 1 : 0.7
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                >
                  <h2 className="font-[var(--font-display)] text-white drop-shadow-lg text-[1.75rem]">
                    {section.titleAccent}
                  </h2>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
