import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";

/* ────────────────────────────────────────────────────────────
   1. HERO — Editorial typography, asymmetric grid, no AI glow
   ──────────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 opacity-[0.10]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.65 0.012 260) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_at_top,oklch(0.30_0.180_265/0.18),transparent_60%)]" aria-hidden />
      <div className="absolute inset-0 grain" aria-hidden />

      <div className="relative mx-auto min-h-[88vh] max-w-6xl px-6 py-24 lg:flex lg:items-center lg:py-28">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>App Store Connect ready</span>
          </div>

          <h1 className="text-[clamp(3rem,7.5vw,5.75rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-white">
            App Store
            <br />
            screenshots,
            <br />
            <span className="font-light italic text-primary-300">composed</span>
            {" "}
            <span className="text-slate-400">in seconds.</span>
          </h1>

          <p className="mt-8 max-w-md text-[16px] leading-relaxed text-slate-400">
            One brief generates a master composition; every other device
            adapts to match. Ship a consistent set for iPhone and iPad,
            ready for App Store Connect.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="press inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-slate-950 shadow-[var(--shadow-lg)] transition-[box-shadow,background] duration-200 hover:bg-slate-100"
            >
              Start free — 2 credits
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/#how-it-works"
              className="press inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 text-[14px] font-medium text-slate-200 transition-colors duration-200 hover:bg-white/[0.06]"
            >
              See how it works
            </Link>
          </div>

          <p className="mt-7 font-mono text-[11px] tabular-nums text-slate-500" data-numeric>
            no card · 1 credit = 1 screenshot · iphone + ipad
          </p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   2. TRUST BAR — single line, large mono numerics
   ──────────────────────────────────────────────────────────── */
function TrustBar() {
  const metrics = [
    { value: "2.4k", label: "Teams" },
    { value: "180k", label: "Screenshots" },
    { value: "4.9", label: "Avg rating" },
    { value: "8s", label: "Median render" },
  ];
  return (
    <section className="relative border-y border-white/5 bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex flex-col items-start border-l border-white/10 px-4 first:border-l-0 sm:px-6"
            >
              <span
                className="font-mono text-3xl font-semibold tabular-nums text-white sm:text-4xl"
                data-numeric
              >
                {m.value}
              </span>
              <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   3. FEATURES — asymmetric editorial blocks
   ──────────────────────────────────────────────────────────── */
function FeatureBlock({
  index,
  eyebrow,
  title,
  description,
  meta,
}: {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
}) {
  const visualByIndex: Record<string, { icon: string; lines: string[] }> = {
    "01": { icon: "✦", lines: ["Prompt input", "Model routing", "Creative output"] },
    "02": { icon: "▣", lines: ['iPhone 6.5"', 'iPad 13"', 'iPad 11"'] },
    "03": { icon: "↺", lines: ["Master image", "Cross-device adapt", "Layout consistency"] },
    "04": { icon: "⬇", lines: ["PNG export", "Batch ready", "Store-safe dimensions"] },
  };
  const visual = visualByIndex[index] ?? { icon: "•", lines: [title, meta] };

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tabular-nums text-primary-300" data-numeric>
            {index}
          </span>
          <span className="h-px w-12 bg-white/15" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </span>
        </div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-lg text-primary-300">
          {visual.icon}
        </div>
      </div>
      <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
      </h3>
      <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
        {description}
      </p>
      <div className="mt-5 space-y-2.5" aria-hidden>
        {visual.lines.map((line) => (
          <div key={`${index}-${line}`} className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-[12px] text-slate-300">
            {line}
          </div>
        ))}
      </div>
      <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] tabular-nums text-slate-300" data-numeric>
        {meta}
      </p>
    </article>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative bg-slate-950">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36">
        <div className="mb-24 max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-300">
            Capabilities
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1] tracking-[-0.03em] text-white sm:text-5xl">
            Precision tools for every screen.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-400">
            Subvra renders one creative master, then adapts every other size
            to match. No more mismatched screenshots in App Store Connect.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <FeatureBlock
            index="01"
            eyebrow="AI generation"
            title="Brief → polished marketing screen."
            description="Describe the vision in plain text or paste your App Store URL. GPT Image 2 builds a high-end product shot tuned to your brand and feature set."
            meta="gpt-image-2 · 1024×1536"
          />
          <FeatureBlock
            index="02"
            eyebrow="Apple presets"
            title="Every required Apple size, exact pixels."
            description="iPhone 6.7&quot;, 6.5&quot;, iPad 13&quot; and 11&quot;. Sharp processes each frame to App Store Connect specs with center-cropped Lanczos resizing."
            meta="1290×2796 · 2064×2752"
          />
          <FeatureBlock
            index="03"
            eyebrow="Consistent set"
            title="One master image. Every device, on-brand."
            description="The first device you select drives the creative; every other size adapts via image edit, so the iPad version looks like the iPhone version — only reflowed."
            meta="image-edit · input-fidelity high"
          />
          <FeatureBlock
            index="04"
            eyebrow="Export"
            title="PNG, lossless, App Store ready."
            description="Download individually or as a batch. Skip the manual cropping, padding, and aspect math — Subvra handles it on the server."
            meta="png · sharp · server-side"
          />
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   4. PRODUCT SHOWCASE — refined panel with editorial labels
   ──────────────────────────────────────────────────────────── */
function ProductShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 grain" aria-hidden />
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,oklch(0.30_0.18_265/0.20),transparent_70%)] blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36">
        <div className="mb-16 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-300">
              The generator
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1] tracking-[-0.03em] text-white sm:text-5xl">
              One interface.
              <br />
              <span className="font-light italic text-slate-300">every</span> screenshot.
            </h2>
          </div>
          <p className="text-[15px] leading-relaxed text-slate-400">
            Pick devices, write or skip a brief, generate. Master image leads,
            other sizes adapt. Saved to your history automatically.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(ellipse,oklch(0.40_0.180_265/0.18),transparent_60%)]" aria-hidden />
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80 backdrop-blur-sm shadow-[0_60px_100px_-20px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 font-mono text-[11px] text-slate-500">
                  subvra — generator
                </span>
              </div>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:inline">
                draft batch
              </span>
            </div>

            <div className="grid lg:grid-cols-5 lg:min-h-[460px]">
              <div className="space-y-6 border-b border-white/10 p-7 lg:col-span-2 lg:border-b-0 lg:border-r">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Step 01 · brief
                  </p>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[13px] leading-relaxed text-slate-300">
                    A minimalist task manager with a clean to-do list, soft
                    gradients, and a floating action button.
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Step 02 · devices
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      ['iPhone 6.5"', true, true],
                      ['iPad 13"', true, false],
                      ['iPad 11"', false, false],
                    ].map(([label, selected, master]) => (
                      <span
                        key={label as string}
                        className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] ${
                          selected
                            ? "bg-white text-slate-950"
                            : "border border-white/15 text-slate-400"
                        }`}
                      >
                        {master && (
                          <span className="absolute -top-1.5 left-2 rounded-full bg-primary-500 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-white">
                            Master
                          </span>
                        )}
                        {label as string}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-500 text-[13px] font-semibold text-white shadow-[var(--shadow-glow-primary)] transition-colors duration-200 hover:bg-primary-400"
                >
                  Generate · 3 credits
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>

              <div className="grid gap-4 p-7 sm:grid-cols-3 lg:col-span-3">
                {[
                  {
                    w: "1284×2778",
                    label: 'BaseDeck iPhone sample',
                    src: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/54/d0/5f/54d05fcf-2603-8708-d27a-e2ca60ad3768/OpenAI_Playground_2026-05-04_at_02.09.25_resized.png/600x1300bb.webp",
                  },
                  {
                    w: "1284×2778",
                    label: 'BaseDeck iPhone sample',
                    src: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/74/bc/8b/74bc8b90-a19e-2cd9-bc98-250625317159/OpenAI_Playground_2026-05-04_at_02.10.31_resized.png/600x1300bb.webp",
                  },
                  {
                    w: "1284×2778",
                    label: 'BaseDeck iPhone sample',
                    src: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/3a/e1/c5/3ae1c5d1-ffd7-67db-866e-54294312c04c/OpenAI_Playground_2026-05-04_at_02.09.46_resized.png/600x1300bb.webp",
                  },
                ].map((d) => (
                  <div key={d.src} className="flex flex-col gap-2">
                    <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.src}
                        alt={`${d.label} from App Store`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] tabular-nums text-slate-500" data-numeric>
                      <span>{d.label}</span>
                      <span>{d.w}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   5. HOW IT WORKS — Swiss grid with continuous rule
   ──────────────────────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Describe",
      desc: "Write a brief, paste your App Store URL, or do both. Subvra blends listing context with creative direction automatically.",
    },
    {
      num: "02",
      title: "Configure",
      desc: "Pick iPhone and iPad targets. The first one becomes your master composition; others adapt to match.",
    },
    {
      num: "03",
      title: "Generate",
      desc: "AI renders your master at exact App Store resolution; Sharp resizes every other device with center-crop Lanczos for crisp output.",
    },
    {
      num: "04",
      title: "Export",
      desc: "Download pixel-perfect PNGs ready to upload to App Store Connect. Saved to your history with the original brief.",
    },
  ];

  return (
    <section id="how-it-works" className="relative bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
        <div className="mb-16 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-300">
              Process
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1] tracking-[-0.03em] text-white sm:text-5xl">
              Four steps.
              <br />
              <span className="font-light italic text-slate-300">brief</span> to{" "}
              <span className="font-light italic text-slate-300">production</span>.
            </h2>
          </div>
          <p className="text-[15px] leading-relaxed text-slate-400">
            We handle the boring parts — Apple sizing, padding, color
            management — so you can focus on the story you want to tell.
          </p>
        </div>

        <div className="border-t border-white/10">
          <div className="grid gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className={`relative pt-10 ${i > 0 ? "lg:pl-8" : ""} ${i < 3 ? "lg:pr-8" : ""}`}
              >
                <div className="absolute left-0 top-0 -translate-y-1/2 bg-slate-950 px-3">
                  <span
                    className="font-mono text-[11px] tabular-nums text-primary-300"
                    data-numeric
                  >
                    {s.num} / 04
                  </span>
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-white">
                  {s.title}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-400">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   6. PRICING — featured tier with strong hierarchy
   ──────────────────────────────────────────────────────────── */
function PricingSection() {
  const plans = [
    {
      name: "Trial",
      price: "$0",
      period: "",
      credits: "2 credits",
      features: ["All device sizes", "PNG export", "3-day access"],
      cta: "Start free",
      featured: false,
    },
    {
      name: "Starter",
      price: "$9",
      period: "/mo",
      credits: "25 credits / mo",
      features: ["All sizes", "PNG export", "Priority queue", "Credit rollover"],
      cta: "Subscribe",
      featured: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/mo",
      credits: "80 credits / mo",
      features: [
        "Everything in Starter",
        "Device frames",
        "Batch generation",
        "Auto top-up",
      ],
      cta: "Get Pro",
      featured: true,
    },
    {
      name: "Team",
      price: "$79",
      period: "/mo",
      credits: "200 credits / mo",
      features: [
        "Everything in Pro",
        "Pooled team credits",
        "Per-seat billing",
        "Org admin panel",
      ],
      cta: "Contact sales",
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="relative border-t border-white/5 bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-300">
            Pricing
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1] tracking-[-0.03em] text-white sm:text-5xl">
            One credit.
            <br />
            <span className="font-light italic text-slate-300">one</span> screenshot.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-400">
            Start free, top up anytime, or subscribe for monthly refills.
          </p>
        </div>

        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <article
              key={p.name}
              className={`relative flex flex-col rounded-3xl p-6 transition-[transform,box-shadow,border-color] duration-300 ${
                p.featured
                  ? "border-2 border-primary-500 bg-slate-900 shadow-[var(--shadow-glow-primary)] hover:-translate-y-1 lg:scale-[1.04]"
                  : "border border-white/10 bg-slate-950 hover:-translate-y-0.5 hover:border-white/20"
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-6 rounded-full bg-primary-500 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                  Most popular
                </div>
              )}

              <div>
                <h3 className="text-base font-semibold text-white">{p.name}</h3>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span
                    className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-white"
                    data-numeric
                  >
                    {p.price}
                  </span>
                  {p.period && (
                    <span className="font-mono text-[12px] text-slate-500" data-numeric>
                      {p.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-300">
                  {p.credits}
                </p>
              </div>

              <ul className="mt-7 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[13px] text-slate-400"
                  >
                    <svg
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={`press mt-8 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors duration-200 ${
                  p.featured
                    ? "bg-white text-slate-950 hover:bg-slate-100"
                    : "border border-white/15 text-slate-200 hover:border-white/30 hover:bg-white/[0.03]"
                }`}
              >
                {p.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   7. CTA — left-anchored, atmospheric
   ──────────────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_85%,oklch(0.32_0.180_265/0.20),transparent_60%)]" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_15%,oklch(0.25_0.18_265/0.15),transparent_50%)]" aria-hidden />
      <div
        className="absolute inset-0 opacity-[0.10]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.50 0.012 260) 0.6px, transparent 0.6px)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="absolute inset-0 grain" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36 lg:py-44">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-300">
            Ready when you are
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1] tracking-[-0.04em] text-white sm:text-6xl">
            Ship stunning
            <br />
            screenshots
            <br />
            <span className="font-light italic text-primary-300">today</span>.
          </h2>
          <p className="mt-7 max-w-md text-[16px] leading-relaxed text-slate-400">
            Two free credits, no card. Generate a polished App Store set in
            under a minute.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="press inline-flex h-13 items-center gap-2 rounded-full bg-white px-7 text-[14px] font-semibold text-slate-950 shadow-[var(--shadow-lg)] transition-colors duration-200 hover:bg-slate-100"
            >
              Start free
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/#pricing"
              className="press inline-flex h-13 items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 text-[14px] font-medium text-slate-200 transition-colors duration-200 hover:bg-white/[0.06]"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <MarketingHeader />
      <main id="main-content">
        <HeroSection />
        <TrustBar />
        <FeaturesSection />
        <ProductShowcase />
        <HowItWorksSection />
        <PricingSection />
        <CTASection />
      </main>
    </>
  );
}
