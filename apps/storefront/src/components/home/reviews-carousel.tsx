'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const REVIEWS = [
  {
    quote:
      '“The linen shirt went straight from the flight to dinner. Quality is unlike anything at this price point.”',
    author: 'AARAV M.',
  },
  {
    quote:
      '“Packed one overshirt for ten days in the hills. Wore it every single evening — zero regrets.”',
    author: 'KABIR S.',
  },
  {
    quote:
      '“Finally a brand that gets travel fits. Breathable, sharp, and the buyback makes it a no-brainer.”',
    author: 'ROHAN T.',
  },
];

export function ReviewsCarousel() {
  const [index, setIndex] = useState(0);

  return (
    <div className="px-6">
      <div className="flex items-center gap-4">
        <p className="text-[11px] font-medium tracking-[0.25em] text-[#8A8378]">REVIEWS</p>
        <span className="h-px flex-1 bg-[#E2DBCD]" />
      </div>

      <blockquote className="mt-7 min-h-[96px] text-[17px] font-light italic leading-relaxed text-[#6B6459]">
        {REVIEWS[index].quote}
      </blockquote>
      <p className="mt-4 text-[11px] font-medium tracking-[0.15em] text-[#8A8378]">
        — {REVIEWS[index].author} · VERIFIED BUYER
      </p>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {REVIEWS.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-[2px] rounded-full transition-all duration-300',
                i === index ? 'w-6 bg-[#171310]' : 'w-2.5 bg-[#E2DBCD]'
              )}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIndex((i) => (i - 1 + REVIEWS.length) % REVIEWS.length)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2DBCD] text-[#6B6459] transition-colors hover:border-[#171310] hover:text-[#171310]"
            aria-label="Previous review"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % REVIEWS.length)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#B7AE9E] text-[#171310] transition-colors hover:border-[#171310]"
            aria-label="Next review"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
