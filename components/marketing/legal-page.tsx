type Section = { heading: string; body: string };

interface LegalPageProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  sections: Section[];
}

export function LegalPage({ eyebrow, title, lastUpdated, sections }: LegalPageProps) {
  return (
    <article className="relative bg-slate-950 text-slate-300">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.50 0.012 260) 0.6px, transparent 0.6px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 py-20 sm:py-28">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-300">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          last updated · {lastUpdated}
        </p>

        <div className="mt-14 space-y-12">
          {sections.map((s, i) => (
            <section key={s.heading} className="grid gap-3 lg:grid-cols-[80px_1fr]">
              <p className="font-mono text-[11px] tabular-nums text-slate-500" data-numeric>
                {String(i + 1).padStart(2, "0")} /
              </p>
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-white">
                  {s.heading}
                </h2>
                <p className="mt-3 text-[14px] leading-[1.7] text-slate-400">
                  {s.body}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
