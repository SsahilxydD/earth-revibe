import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#faf8f5] px-4 py-10 sm:py-12">
      {/* Organic grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle warm radial glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(180,130,90,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Decorative diagonal line */}
      <div
        className="pointer-events-none fixed right-0 top-0 h-full w-px opacity-[0.06]"
        style={{
          background:
            'linear-gradient(to bottom, transparent, #8b6f47 30%, #8b6f47 70%, transparent)',
          right: '12%',
        }}
      />

      <div className="relative z-10 w-full max-w-[400px] sm:max-w-[420px]">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="group inline-flex flex-col items-center gap-3">
            <Image
              src="/Earth Revibe Logo Black.png"
              alt="Earth Revibe"
              width={44}
              height={44}
              className="transition-transform duration-500 group-hover:scale-105"
            />
            <span className="text-[13px] font-semibold uppercase tracking-[0.35em] text-[#1a1a1a] sm:text-sm">
              Earth Revibe
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="relative rounded-[20px] border border-[#e8e2da] bg-white/90 px-6 py-8 shadow-[0_4px_40px_rgba(139,111,71,0.06)] backdrop-blur-sm sm:px-9 sm:py-10">
          {/* Subtle top accent line */}
          <div className="absolute left-1/2 top-0 h-[2px] w-16 -translate-x-1/2 rounded-b-full bg-gradient-to-r from-transparent via-[#8b6f47]/30 to-transparent" />
          {children}
        </div>

        {/* Footer text */}
        <p className="mt-6 text-center text-[11px] tracking-wider text-[#b0a898]">
          SUSTAINABLE FASHION, DELIVERED TO YOUR DOOR
        </p>
      </div>
    </div>
  );
}
