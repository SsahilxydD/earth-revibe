'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';

const MESSAGES = [
  'LAUNCH SPECIAL: Use code EARTH15 for 15% off',
  'FREE SHIPPING ON ALL ORDERS',
  'NEW ARRIVALS JUST DROPPED',
  'EASY & HASSLE FREE RETURNS',
];

const ROTATE_INTERVAL = 4000;

export function AnnouncementBar() {
  const { announcementDismissed, dismissAnnouncement } = useUiStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();

  const rotateMessage = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % MESSAGES.length);
      setIsVisible(true);
    }, 300);
  }, []);

  useEffect(() => {
    if (announcementDismissed) return;
    const timer = setInterval(rotateMessage, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [announcementDismissed, rotateMessage]);

  // Homepage runs full-bleed covers under a transparent header — no bar there.
  if (pathname === '/') return null;

  if (announcementDismissed) return null;

  return (
    <div data-announcement-bar className="relative w-full bg-[var(--color-primary)] text-white">
      <div className="flex items-center justify-center px-10 py-2.5">
        <p
          className={`text-center text-xs font-semibold tracking-[0.15em] transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {MESSAGES[currentIndex]}
        </p>
      </div>
      <button
        onClick={dismissAnnouncement}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-white/70 hover:text-white transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
