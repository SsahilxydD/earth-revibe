'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';
import {
  DESTINATION_STORIES,
  STORY_DURATION_MS,
  type DestinationStory,
} from './destination-stories';

interface StoryViewerProps {
  stories?: DestinationStory[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Instagram-style story viewer for the destination story circles.
 *
 * Feel checklist (the things that make it read as "real stories"):
 * - segmented progress bars animated via transform only (compositor-safe),
 *   driven by one rAF loop that mutates the fill ref directly — React state
 *   only changes on item/stack transitions, never per frame
 * - tap right 2/3 = next, left 1/3 = previous, press-and-hold = pause
 * - swipe down (offset or velocity) dismisses
 * - next image is preloaded the moment an item starts playing
 */
export function StoryViewer({
  stories = DESTINATION_STORIES,
  initialIndex,
  onClose,
}: StoryViewerProps) {
  const [pos, setPos] = useState({ s: initialIndex, i: 0 });
  const [liked, setLiked] = useState(false);

  // The rAF loop can observe a frame with stale React state, so navigation
  // reads the latest position from a ref and sets absolute positions —
  // a double-fired goNext computes the same target twice (idempotent)
  // instead of skipping past the end of a stack.
  const posRef = useRef(pos);
  posRef.current = pos;

  const stack = stories[pos.s];
  const item = stack.items[pos.i];
  const duration = item.duration ?? STORY_DURATION_MS;

  // ---- playback engine -------------------------------------------------
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const barsRef = useRef<HTMLDivElement | null>(null);
  const elapsedRef = useRef(0);
  const pausedRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingRef = useRef(false);

  const goNext = useCallback(() => {
    const { s, i } = posRef.current;
    elapsedRef.current = 0;
    setLiked(false);
    if (i < stories[s].items.length - 1) {
      setPos({ s, i: i + 1 });
    } else if (s < stories.length - 1) {
      setPos({ s: s + 1, i: 0 });
    } else {
      onClose();
    }
  }, [stories, onClose]);

  const goPrev = useCallback(() => {
    const { s, i } = posRef.current;
    elapsedRef.current = 0; // first story restarts itself
    setLiked(false);
    if (i > 0) {
      setPos({ s, i: i - 1 });
    } else if (s > 0) {
      setPos({ s: s - 1, i: 0 });
    }
  }, [stories]);

  // The rAF loop writes inline transforms straight onto the fill spans, and
  // React reuses those DOM nodes across item changes — so a stale inline
  // scaleX from a half-played segment would override the class-based state.
  // Reset every segment's inline transform whenever the position changes.
  useLayoutEffect(() => {
    const fills = barsRef.current?.querySelectorAll<HTMLSpanElement>('[data-fill]');
    fills?.forEach((el, idx) => {
      el.style.transform = idx < pos.i ? 'scaleX(1)' : 'scaleX(0)';
    });
  }, [pos]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // rAF suspends while the tab/app is hidden; clamp the delta so a
      // backgrounded story resumes where it left off instead of jumping.
      const dt = Math.min(now - last, 64);
      last = now;
      if (!pausedRef.current) {
        elapsedRef.current += dt;
        const ratio = Math.min(elapsedRef.current / duration, 1);
        if (fillRef.current) {
          fillRef.current.style.transform = `scaleX(${ratio})`;
        }
        if (ratio >= 1) {
          goNext();
          raf = requestAnimationFrame(tick);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, goNext]);

  // ---- preload next media ----------------------------------------------
  useEffect(() => {
    const next = stack.items[pos.i + 1]?.src ?? stories[pos.s + 1]?.items[0]?.src;
    if (next) {
      const img = new window.Image();
      img.src = next;
    }
  }, [stack, pos, stories]);

  // ---- body scroll lock + escape key ------------------------------------
  useEffect(() => {
    lockBodyScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, goNext, goPrev]);

  // ---- tap / hold gestures ----------------------------------------------
  const onPointerDown = () => {
    holdingRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      holdingRef.current = true;
      pausedRef.current = true;
    }, 200);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdingRef.current) {
      // was a hold — just resume
      holdingRef.current = false;
      pausedRef.current = false;
      return;
    }
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    if (x < width / 3) goPrev();
    else goNext();
  };

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdingRef.current = false;
    pausedRef.current = false;
  };

  const share = async () => {
    try {
      await navigator.share?.({
        title: `Earth Revibe — ${stack.name}`,
        url: window.location.origin + (item.cta?.href ?? '/'),
      });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const segments = useMemo(() => stack.items.map((_, i) => i), [stack]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="relative h-[100dvh] w-full overflow-hidden bg-black md:h-[92dvh] md:max-w-[420px] md:rounded-2xl"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 700) onClose();
        }}
      >
        {/* media */}
        {/* unoptimized: the preloader warms the exact raw URL, so item
            transitions are instant — next/image's per-size variants would
            bypass that cache and flash dark on every advance. */}
        <Image
          key={`${pos.s}-${pos.i}`}
          src={item.src}
          alt={`${stack.name} — Earth Revibe story`}
          fill
          priority
          unoptimized
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />

        {/* gesture layer (between chrome bars) */}
        <div
          className="absolute inset-x-0 bottom-24 top-20 cursor-pointer select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* progress segments */}
        <div ref={barsRef} className="absolute inset-x-3 top-3 flex gap-1">
          {/* Fill state lives entirely in inline transforms (set by the
              layout effect + the rAF writer). Tailwind's scale-x-* utilities
              use the CSS `scale` property, which would multiply against the
              inline transform and zero out the animating fill. */}
          {segments.map((i) => (
            <div key={i} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/35">
              <span
                ref={i === pos.i ? fillRef : undefined}
                data-fill
                className="block h-full w-full origin-left rounded-full bg-white"
              />
            </div>
          ))}
        </div>

        {/* identity row */}
        <div className="absolute inset-x-0 top-6 flex items-center gap-3 px-4">
          <motion.span
            layoutId={`story-avatar-${stack.id}`}
            className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-[#A9663B] ring-offset-2 ring-offset-transparent"
          >
            <Image
              src={stack.avatar}
              alt=""
              fill
              sizes="36px"
              className="object-cover"
              style={{ objectPosition: stack.avatarPosition }}
            />
          </motion.span>
          <div className="min-w-0 flex-1 text-white">
            <p className="text-sm font-semibold leading-tight">{stack.name}</p>
            <p className="text-xs leading-tight text-white/70">earthrevibe · now</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-white"
            aria-label="Close stories"
          >
            <X className="h-6 w-6" strokeWidth={1.8} />
          </button>
        </div>

        {/* per-item copy + CTA */}
        {(item.headline || item.cta) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 px-5 text-white">
            {item.kicker && (
              <p className="text-[10px] font-medium tracking-[0.22em] text-white/80">
                {item.kicker}
              </p>
            )}
            {item.headline && (
              <p className="mt-1 text-2xl font-light italic leading-snug">{item.headline}</p>
            )}
            {item.cta && (
              <Link
                href={item.cta.href}
                onClick={onClose}
                className="pointer-events-auto mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-black"
              >
                {item.cta.label} →
              </Link>
            )}
          </div>
        )}

        {/* bottom bar — send message / heart / share */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-center gap-4 px-4 pb-5 pt-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            readOnly
            placeholder="Send message"
            aria-label="Send message"
            className="h-11 min-w-0 flex-1 rounded-full border border-white/90 bg-transparent px-5 text-sm text-white placeholder:text-white/75 focus:outline-none"
          />
          <button
            onClick={() => setLiked((l) => !l)}
            aria-label={liked ? 'Unlike story' : 'Like story'}
            className="shrink-0 text-white transition-transform active:scale-90"
          >
            <Heart
              className={cn('h-7 w-7', liked && 'fill-red-500 text-red-500')}
              strokeWidth={1.6}
            />
          </button>
          <button
            onClick={share}
            aria-label="Share story"
            className="shrink-0 text-white transition-transform active:scale-90"
          >
            <Send className="h-7 w-7" strokeWidth={1.6} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
