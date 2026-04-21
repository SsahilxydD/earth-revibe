import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Offers | Earth Revibe',
  description:
    'Three running offers at Earth Revibe: 100% cashback on your first order, 20% referral bonus, and a 365-day 33% rewards window.',
};

interface Offer {
  eyebrow: string;
  big: string;
  headline: string;
  description: string;
  fine: string[];
  cta: { label: string; href: string };
  theme: 'dark' | 'light';
}

const OFFERS: Offer[] = [
  {
    eyebrow: 'OFFER 01 · WELCOME',
    big: '100%',
    headline: 'Cashback on your first order',
    description:
      'Every rupee you spend on your first order comes back as loyalty points. A ₹2,000 order = ₹2,000 in points, sitting on your account the moment it ships.',
    fine: [
      'Applied automatically — no code needed.',
      'Points credit when the order is marked shipped.',
      'Redeem by emailing support or raising a request from your account.',
    ],
    cta: { label: 'Shop your first order', href: '/products' },
    theme: 'dark',
  },
  {
    eyebrow: 'OFFER 02 · REFERRAL',
    big: '20%',
    headline: 'For every friend you bring in',
    description:
      "Share your referral link. When a friend places their first order, you earn 20% of their order value as points — and they get a 15% discount off their first order. Both of you win.",
    fine: [
      'Friend must be a new Earth Revibe customer.',
      "Your reward is credited when their first order ships.",
      'No cap on how many friends you can invite.',
    ],
    cta: { label: 'Get your referral link', href: '/account/referrals' },
    theme: 'light',
  },
  {
    eyebrow: 'OFFER 03 · REPEAT REWARDS',
    big: '33%',
    headline: '365 days of rewards, every order',
    description:
      "For a full year from your first order, every repeat purchase earns 33% back in points. Stack them. Spend them. Keep coming back — the rewards window doesn't reset, it runs.",
    fine: [
      'Kicks in the moment your first order is delivered.',
      'Active for 365 days; auto-applied on every eligible order.',
      'Points stack with referral bonuses and first-order cashback.',
    ],
    cta: { label: 'View your balance', href: '/account/loyalty' },
    theme: 'dark',
  },
];

export default function OffersPage() {
  return (
    <div>
      {/* Hero — white so it contrasts against the dark first offer section below */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-xl px-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
            What's on right now
          </p>
          <h1 className="mt-4 text-3xl font-bold uppercase tracking-[0.15em] text-[var(--color-text)] sm:text-4xl md:text-5xl">
            Three offers,
            <br />
            always on.
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-[var(--color-muted)]">
            No flash sales. No gimmicks. Three running offers that reward you for shopping and
            sharing — layered so you can stack them on every order.
          </p>
        </div>
      </section>

      {OFFERS.map((offer, idx) => {
        const isDark = offer.theme === 'dark';
        return (
          <section
            key={offer.big}
            className={
              isDark
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text)]'
            }
          >
            <div className="mx-auto grid max-w-5xl gap-10 px-6 py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16 md:py-28">
              {/* Left: number */}
              <div className="flex flex-col justify-center">
                <p
                  className={
                    isDark
                      ? 'text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40'
                      : 'text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]'
                  }
                >
                  {offer.eyebrow}
                </p>
                <p
                  className="mt-4 font-bold leading-none tracking-tight"
                  style={{ fontSize: 'clamp(96px, 18vw, 200px)' }}
                >
                  {offer.big}
                </p>
              </div>

              {/* Right: copy + CTA */}
              <div className="flex flex-col justify-center">
                <h2 className="text-2xl font-bold uppercase tracking-wider md:text-3xl">
                  {offer.headline}
                </h2>
                <p
                  className={
                    isDark
                      ? 'mt-5 text-sm leading-[1.8] text-white/70'
                      : 'mt-5 text-sm leading-[1.8] text-[var(--color-muted)]'
                  }
                >
                  {offer.description}
                </p>
                {/* Native list markers — browsers handle baseline + wrapped
                    text alignment automatically. Marker pseudo styles its
                    color and size without touching layout. */}
                <ul
                  className={
                    isDark
                      ? 'mt-7 list-disc space-y-2 pl-5 text-[12px] leading-[1.7] text-white/70 marker:text-[9px] marker:text-white/35'
                      : 'mt-7 list-disc space-y-2 pl-5 text-[12px] leading-[1.7] text-[var(--color-muted)] marker:text-[9px] marker:text-[var(--color-muted)]'
                  }
                >
                  {offer.fine.map((line) => (
                    <li key={line} className="pl-1">
                      {line}
                    </li>
                  ))}
                </ul>
                <Link
                  href={offer.cta.href}
                  className={
                    isDark
                      ? 'mt-8 inline-flex items-center gap-2 border border-white/20 bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-primary)] transition-colors hover:bg-white/90 w-fit'
                      : 'mt-8 inline-flex items-center gap-2 border border-[var(--color-primary)] bg-[var(--color-primary)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:opacity-90 w-fit'
                  }
                >
                  {offer.cta.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Divider between sections — only draw on the last one for a clean end */}
            {idx < OFFERS.length - 1 && (
              <div className={isDark ? 'h-px bg-white/10' : 'h-px bg-[var(--color-border)]'} />
            )}
          </section>
        );
      })}

      {/* Footer CTA */}
      <section className="border-t border-[var(--color-border)] py-16 md:py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
            Fine print
          </p>
          <p className="mt-4 text-[13px] leading-[1.8] text-[var(--color-muted)]">
            Loyalty points expire 6 months after they are earned. Redemption codes are single-use
            and valid for 60 days from issue. Offers cannot be combined with promotional discount
            codes at checkout. We reserve the right to adjust offer mechanics with 30 days' notice.
          </p>
          <Link
            href="/account/loyalty"
            className="mt-8 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-primary)] hover:opacity-70"
          >
            View your balance
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
