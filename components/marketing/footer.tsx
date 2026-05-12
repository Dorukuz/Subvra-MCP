import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-white/5 bg-slate-950 text-slate-400">
      <div
        className="absolute inset-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.50 0.012 260) 0.6px, transparent 0.6px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[12px] font-semibold text-slate-950">
                S
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-slate-950" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-white">Subvra</span>
            </Link>
            <p className="mt-4 max-w-[280px] text-[13px] leading-relaxed text-slate-500">
              Premium AI for App Store creatives. Pixel-accurate exports
              for iPhone and iPad in one batch.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All systems operational
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Product
            </h4>
            <ul className="space-y-3">
              {[
                ["Features", "/#features"],
                ["How it works", "/#how-it-works"],
                ["Pricing", "/#pricing"],
                ["Dashboard", "/dashboard"],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[13px] text-slate-400 transition-colors duration-200 hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Legal
            </h4>
            <ul className="space-y-3">
              {[
                ["Terms", "/terms"],
                ["Privacy", "/privacy"],
                ["Refund", "/refund"],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[13px] text-slate-400 transition-colors duration-200 hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:support@subvra.com"
                  className="text-[13px] text-slate-400 transition-colors duration-200 hover:text-white"
                >
                  Contact
                </a>
              </li>
              <li>
                <Link
                  href="/sign-in"
                  className="text-[13px] text-slate-400 transition-colors duration-200 hover:text-white"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
          <p className="font-mono text-[11px] tabular-nums text-slate-600" data-numeric>
            © {new Date().getFullYear()} Subvra · all rights reserved
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-600">
            built for App Store Connect
          </p>
        </div>
      </div>
    </footer>
  );
}
