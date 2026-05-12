import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-3" aria-label="Subvra home">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[12px] font-semibold text-slate-950 transition-transform duration-200 group-hover:scale-105">
            S
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-slate-950" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight text-white">Subvra</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">App Store · AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {[
            ["Features", "/#features"],
            ["How it works", "/#how-it-works"],
            ["Pricing", "/#pricing"],
            ["MCP Guide", "/docs/mcp-guide"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-full px-3 py-1.5 text-[13px] text-slate-400 transition-colors duration-200 hover:bg-white/5 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-slate-400 transition-colors duration-200 hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-slate-950 shadow-[var(--shadow-sm)] transition-[box-shadow,background] duration-200 hover:bg-slate-100"
          >
            Get started
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
