'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';

const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_API_KEY || '';

interface Suggestion {
  placeName: string;
  placeAddress: string;
  city: string;
  state: string;
  pinCode: string;
}

interface MapplsAddressInputProps {
  onSelect: (address: { line1: string; city: string; state: string; pinCode: string }) => void;
}

export function MapplsAddressInput({ onSelect }: MapplsAddressInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3 || !MAPPLS_KEY) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const resp = await fetch(
        `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/autosuggest?query=${encodeURIComponent(q)}&tokenizeAddress=true`
      );
      const data = await resp.json();
      const results = (data.suggestedLocations || []).map((s: any) => ({
        placeName: s.placeName || '',
        placeAddress: s.placeAddress || '',
        city: s.city || '',
        state: s.state || '',
        pinCode: s.pincode || s.postalCode || '',
      }));
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelect = (s: Suggestion) => {
    const line1 = [s.placeName, s.placeAddress].filter(Boolean).join(', ');
    setQuery(line1);
    setIsOpen(false);
    onSelect({ line1, city: s.city, state: s.state, pinCode: s.pinCode });
  };

  const handleUseLocation = async () => {
    if (!navigator.geolocation || !MAPPLS_KEY) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resp = await fetch(
            `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/rev_geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          const data = await resp.json();
          const result = data.results?.[0];
          if (result) {
            const addr = {
              line1: [result.street, result.subSubLocality, result.subLocality]
                .filter(Boolean)
                .join(', '),
              city: result.city || result.district || '',
              state: result.state || '',
              pinCode: result.pincode || '',
            };
            setQuery(addr.line1);
            onSelect(addr);
          }
        } catch {
          // Silently fail
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search for your address..."
          className="w-full rounded-lg border border-[var(--color-border)] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)]"
        />
        {isLoading && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-muted)]"
          />
        )}
      </div>

      <button
        type="button"
        onClick={handleUseLocation}
        disabled={locating}
        className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)] disabled:opacity-50"
      >
        <MapPin size={12} />
        {locating ? 'Detecting...' : 'Use my location'}
      </button>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="block w-full px-3 py-2.5 text-left text-xs hover:bg-[var(--color-surface)] transition-colors"
            >
              <p className="font-medium text-[var(--color-text)]">{s.placeName}</p>
              <p className="text-[var(--color-muted)] mt-0.5">{s.placeAddress}</p>
              {s.pinCode && (
                <p className="text-[var(--color-muted)]">
                  {s.city}, {s.state} — {s.pinCode}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
