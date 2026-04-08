import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-white px-7 pb-10 pt-[72px] font-[family-name:var(--font-inter)]">
      <div className="flex w-full max-w-[337px] flex-col items-center gap-12">
        {/* Logo */}
        <Link href="/">
          <Image
            src="/Earth Revibe Logo Black.png"
            alt="Earth Revibe"
            width={160}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>

        {/* Page content */}
        <div className="w-full">{children}</div>
      </div>

      <div />
    </div>
  );
}
