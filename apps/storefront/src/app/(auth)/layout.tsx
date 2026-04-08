import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-white px-7 pt-[72px] pb-10 font-[family-name:var(--font-inter)]">
      <div className="flex w-full max-w-[337px] flex-1 flex-col items-center">
        {/* Logo — centered, 160×40 matching Pencil */}
        <Link href="/" className="mb-12">
          <Image
            src="/Earth Revibe Logo Black.png"
            alt="Earth Revibe"
            width={160}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>

        {/* Page content — takes remaining space */}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
