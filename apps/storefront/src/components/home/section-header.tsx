export function SectionHeader({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div className="text-center mb-12 lg:mb-16 px-6 lg:px-14">
      <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-3">
        {subtitle}
      </p>
      <h2 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black">
        {title}
      </h2>
    </div>
  );
}
