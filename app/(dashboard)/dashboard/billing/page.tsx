"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";

type CatalogPlan = { key: string; name: string; credits: number; priceId: string };
type CatalogTopup = { key: string; credits: number; priceId: string };

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { getIdToken, account, refreshAccount, loading: authLoading } = useAuth();
  const [catalog, setCatalog] = useState<{
    configured: boolean;
    plans: CatalogPlan[];
    topups: CatalogTopup[];
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const urlBanner = useMemo(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      return "Payment successful. Credits and subscription updates may take a few seconds.";
    }
    if (checkout === "canceled") {
      return "Checkout was canceled.";
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      void refreshAccount();
    }
  }, [searchParams, refreshAccount]);

  useEffect(() => {
    fetch("/api/billing/catalog")
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => setCatalog({ configured: false, plans: [], topups: [] }));
  }, []);

  const startCheckout = useCallback(
    async (priceId: string, mode: "subscription" | "payment") => {
      setBusy(priceId);
      setActionBanner(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Sign in required");
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ priceId, mode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Checkout failed");
        if (data.url) window.location.href = data.url as string;
        else throw new Error("No checkout URL returned");
      } catch (e) {
        setActionBanner(e instanceof Error ? e.message : "Checkout failed");
      } finally {
        setBusy(null);
      }
    },
    [getIdToken]
  );

  const openPortal = useCallback(async () => {
    setBusy("portal");
    setActionBanner(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in required");
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open billing portal");
      if (data.url) window.location.href = data.url as string;
    } catch (e) {
      setActionBanner(e instanceof Error ? e.message : "Portal error");
    } finally {
      setBusy(null);
    }
  }, [getIdToken]);

  const trialEnds = account?.trial?.endsAt
    ? new Date(account.trial.endsAt).toLocaleDateString()
    : null;
  const sub = account?.subscription;
  const banner = actionBanner ?? urlBanner;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-10">
        <p className="text-eyebrow mb-3 text-primary-700 dark:text-primary-400">
          Billing
        </p>
        <h1 className="text-display text-[2.25rem] sm:text-[2.5rem] text-foreground">
          Subscription, credits, and invoices.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
          Buy credits when you need them, subscribe for monthly refills, or open
          the Stripe customer portal to manage payment methods and invoices.
        </p>
      </header>

      {banner && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-primary-500/30 bg-primary-50 px-4 py-3 text-[13px] text-primary-900 dark:bg-primary-900/20 dark:text-primary-100"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <span className="leading-relaxed">{banner}</span>
        </div>
      )}

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <article className="surface-tinted relative overflow-hidden rounded-3xl p-6">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary-500/12 blur-3xl" aria-hidden />
          <p className="relative text-eyebrow text-primary-700 dark:text-primary-400">
            Plan
          </p>
          <p className="relative mt-3 text-2xl font-semibold text-foreground">
            {authLoading
              ? "…"
              : sub
                ? sub.plan
                : "No active subscription"}
          </p>
          {sub && (
            <p className="relative mt-1 font-mono text-[11px] uppercase tracking-wider text-slate-500">
              status · {sub.status}
            </p>
          )}
          <button
            type="button"
            onClick={openPortal}
            disabled={busy !== null || !account?.hasStripeCustomer}
            className="press relative mt-6 inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-surface-1 px-4 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            {busy === "portal" ? "Opening…" : "Stripe portal"}
          </button>
        </article>

        <article className="rounded-3xl border border-hairline bg-surface-1 p-6">
          <p className="text-eyebrow text-slate-500">Credits</p>
          <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-foreground" data-numeric>
            {authLoading || !account ? "…" : account.credits}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            available right now
          </p>
          {trialEnds && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent-300/60 bg-accent-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-700 dark:border-accent-700/50 dark:bg-accent-700/10 dark:text-accent-300">
              trial ends {trialEnds}
            </p>
          )}
        </article>

        <article className="rounded-3xl border border-hairline bg-surface-1 p-6">
          <p className="text-eyebrow text-slate-500">Auto top-up</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {account?.autoTopUp ? (
              <span className="text-emerald-600 dark:text-emerald-400">On</span>
            ) : (
              <span className="text-slate-400">Off</span>
            )}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            Manage in the Stripe portal.
          </p>
        </article>
      </section>

      {!catalog?.configured && (
        <div className="mb-10 flex items-start gap-3 rounded-2xl border border-accent-300/60 bg-accent-50 px-4 py-3 text-[13px] text-accent-700 dark:border-accent-700/50 dark:bg-accent-700/10 dark:text-accent-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="leading-relaxed">
            Stripe price IDs are missing. Add recurring prices to{" "}
            <code className="font-mono text-[12px]">STRIPE_*_PRICE_ID</code> for
            subscriptions and/or top-ups, plus{" "}
            <code className="font-mono text-[12px]">STRIPE_SECRET_KEY</code> for
            checkout.
          </p>
        </div>
      )}

      <section className="mb-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-primary-700 dark:text-primary-400">
              Subscriptions
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Monthly plans
            </h2>
          </div>
          <p className="text-[12px] text-slate-500">Cancel anytime.</p>
        </div>

        {(catalog?.plans ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-hairline bg-surface-1 px-5 py-8 text-center text-[13px] text-slate-500">
            No subscription plans configured yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(catalog?.plans ?? []).map((plan, idx) => {
              const featured = idx === 1;
              return (
                <article
                  key={plan.key}
                  className={`relative rounded-3xl p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 ${
                    featured
                      ? "border-2 border-foreground bg-surface-1 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]"
                      : "border border-hairline bg-surface-1 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]"
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-6 rounded-full bg-foreground px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-background">
                      Recommended
                    </span>
                  )}
                  <h3 className="text-base font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-foreground" data-numeric>
                    {plan.credits}
                    <span className="ml-1 font-sans text-[13px] font-normal text-slate-500">
                      credits / mo
                    </span>
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Refills automatically at the start of each cycle.
                  </p>
                  <button
                    type="button"
                    disabled={busy !== null || !catalog?.configured}
                    onClick={() => startCheckout(plan.priceId, "subscription")}
                    className={`press mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                      featured
                        ? "bg-foreground text-background hover:opacity-90"
                        : "border border-hairline bg-surface-1 text-foreground hover:border-slate-400 dark:hover:border-slate-600"
                    }`}
                  >
                    {busy === plan.priceId ? "Redirecting…" : "Subscribe"}
                    {busy !== plan.priceId && (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-700 dark:text-accent-300">
              One-time
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Top-up packs
            </h2>
          </div>
          <p className="text-[12px] text-slate-500">No expiry. Stack with your plan.</p>
        </div>

        {(catalog?.topups ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-hairline bg-surface-1 px-5 py-8 text-center text-[13px] text-slate-500">
            No top-up packs configured yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(catalog?.topups ?? []).map((pack) => (
              <article
                key={pack.key}
                className="group flex flex-col justify-between rounded-3xl border border-hairline bg-surface-1 p-6 shadow-[var(--shadow-xs)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
              >
                <div>
                  <p className="font-mono text-4xl font-semibold tabular-nums text-foreground" data-numeric>
                    +{pack.credits}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    one-time credit pack
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy !== null || !catalog?.configured}
                  onClick={() => startCheckout(pack.priceId, "payment")}
                  className="press mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary-600 text-[13px] font-semibold text-white shadow-[var(--shadow-glow-primary)] transition-colors hover:bg-primary-500 disabled:opacity-50"
                >
                  {busy === pack.priceId ? "Redirecting…" : "Buy credits"}
                  {busy !== pack.priceId && (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  )}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
