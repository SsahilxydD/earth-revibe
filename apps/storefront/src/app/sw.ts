import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

// Travel-Circle application flow relies on real-time WhatsApp OTP + submit
// calls; caching stale precompiled HTML would be confusing. Strip any
// /apply-for-trip-form entries from the precache manifest.
const manifest = (self.__SW_MANIFEST ?? []).filter((entry) => {
  const url = typeof entry === 'string' ? entry : entry.url;
  return !url.includes('/apply-for-trip-form');
});

const serwist = new Serwist({
  precacheEntries: manifest,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
