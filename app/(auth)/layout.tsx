import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.50 0.012 260) 0.8px, transparent 0.8px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_at_top,oklch(0.56_0.180_265/0.10),transparent_70%)]"
        aria-hidden
      />

      <Link
        href="/"
        className="group mb-10 inline-flex items-center gap-3"
        aria-label="Back to home"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-[14px] font-semibold text-background shadow-[var(--shadow-sm)] transition-transform duration-200 group-hover:scale-105">
          S
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-background" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight text-foreground">
            Subvra
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            App Store · AI
          </span>
        </span>
      </Link>

      {children}

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        © {new Date().getFullYear()} Subvra
      </p>
    </div>
  );
}
