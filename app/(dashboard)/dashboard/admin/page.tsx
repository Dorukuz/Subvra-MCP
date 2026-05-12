"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";

type Stats = {
  users: { total: number; activeToday: number };
  generations: { today: number; thisMonth: number; allTime: number };
  credits: { consumed30d: number; granted30d: number };
  subscriptions: { active: number; churned30d: number };
  revenue: { mrr: number; arr: number };
};

type SearchUser = {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  credits: number;
  createdAt?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { account, loading: authLoading, getIdToken, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [adjTarget, setAdjTarget] = useState("");
  const [adjDelta, setAdjDelta] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjMsg, setAdjMsg] = useState<string | null>(null);
  const [adjBusy, setAdjBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user && account && account.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, account, router]);

  const loadStats = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to load stats");
      }
      const data = await res.json();
      setStats(data);
      setStatsError(null);
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : "Failed to load stats");
    }
  }, [getIdToken]);

  useEffect(() => {
    if (account?.role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state updates only after await inside loadStats
    void loadStats();
  }, [account?.role, loadStats]);

  const runSearch = async () => {
    setSearching(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const q = new URLSearchParams();
      if (searchQ.trim()) q.set("q", searchQ.trim());
      const res = await fetch(`/api/admin/users?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setSearchResults(data.users || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const downloadExport = async (type: "users" | "transactions" | "generations") => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`/api/admin/export?type=${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyAdjustment = async () => {
    setAdjBusy(true);
    setAdjMsg(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const delta = Number(adjDelta);
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target: adjTarget.trim(),
          delta,
          reason: adjReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adjustment failed");
      setAdjMsg(`OK — new balance ${data.balance}`);
      setAdjTarget("");
      setAdjDelta("");
      setAdjReason("");
      void loadStats();
    } catch (e) {
      setAdjMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdjBusy(false);
    }
  };

  if (authLoading || (user && !account)) {
    return (
      <div className="mx-auto max-w-6xl py-12 font-mono text-[11px] uppercase tracking-wider text-slate-500">
        loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl py-12 text-sm text-slate-500">
        Sign in required.
      </div>
    );
  }

  if (account && account.role !== "admin") {
    return (
      <div className="mx-auto max-w-6xl py-12 font-mono text-[11px] uppercase tracking-wider text-slate-500">
        redirecting…
      </div>
    );
  }

  if (!account || account.role !== "admin") {
    return null;
  }

  const statTiles = [
    { label: "Total users", value: stats?.users.total ?? "—" },
    { label: "Active today", value: stats?.users.activeToday ?? "—" },
    { label: "Debits 30d", value: stats?.credits.consumed30d ?? "—" },
    { label: "Active subs", value: stats?.subscriptions.active ?? "—" },
    { label: "Gens today", value: stats?.generations.today ?? "—" },
    { label: "Gens 30d", value: stats?.generations.thisMonth ?? "—" },
    { label: "Granted 30d", value: stats?.credits.granted30d ?? "—" },
    { label: "All-time debits", value: stats?.generations.allTime ?? "—" },
  ];

  const inputCls =
    "h-11 rounded-xl border border-hairline bg-surface-1 px-3.5 text-sm text-foreground transition-[border-color] duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:hover:border-slate-600";
  const ghostBtnCls =
    "press inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface-1 px-3.5 text-[12px] font-medium text-foreground transition-colors hover:border-slate-300 dark:hover:border-slate-600";
  const primaryBtnCls =
    "press inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50";

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-eyebrow mb-3 text-primary-700 dark:text-primary-400">
            Admin · internal
          </p>
          <h1 className="text-display text-[2.25rem] sm:text-[2.5rem] text-foreground">
            System overview & credit tools.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadExport("users")}
            className={ghostBtnCls}
          >
            Users CSV
          </button>
          <button
            type="button"
            onClick={() => downloadExport("transactions")}
            className={ghostBtnCls}
          >
            Transactions CSV
          </button>
          <button
            type="button"
            onClick={() => downloadExport("generations")}
            className={ghostBtnCls}
          >
            Generations CSV
          </button>
          <button
            type="button"
            onClick={() => loadStats()}
            className={primaryBtnCls}
          >
            Refresh
          </button>
        </div>
      </header>

      {statsError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-danger-500/30 bg-danger-500/8 px-4 py-3 text-[13px] text-danger-600"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {statsError}
        </div>
      )}

      <section>
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Metrics
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statTiles.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-hairline bg-surface-1 p-5"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {stat.label}
              </p>
              <p
                className="mt-3 font-mono text-2xl font-semibold tabular-nums text-foreground"
                data-numeric
              >
                {stat.value}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-hairline bg-surface-1 p-6">
        <h2 className="text-base font-semibold text-foreground">User search</h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Lookup by email, display name, or Firebase UID.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="alex@company.com or yK4…"
            className={`${inputCls} min-w-[240px] flex-1`}
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={searching}
            className="press inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-foreground px-5 text-[13px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        {searchResults.length > 0 && (
          <ul className="mt-5 divide-y divide-hairline">
            {searchResults.map((u) => (
              <li
                key={u.uid}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0"
              >
                <span className="truncate text-foreground">{u.email}</span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500" data-numeric>
                  {u.credits}c · {u.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-hairline bg-surface-1 p-6">
        <h2 className="text-base font-semibold text-foreground">Credit adjustment</h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Manually grant or revoke credits. Audited.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <input
            value={adjTarget}
            onChange={(e) => setAdjTarget(e.target.value)}
            placeholder="Email or UID"
            className={inputCls}
          />
          <input
            value={adjDelta}
            onChange={(e) => setAdjDelta(e.target.value)}
            placeholder="+10 or -5"
            type="number"
            className={`${inputCls} font-mono tabular-nums`}
            data-numeric
          />
          <input
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            placeholder="Reason"
            className={inputCls}
          />
        </div>
        {adjMsg && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
            {adjMsg}
          </p>
        )}
        <button
          type="button"
          onClick={applyAdjustment}
          disabled={adjBusy}
          className="press mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary-600 px-5 text-[13px] font-semibold text-white shadow-[var(--shadow-glow-primary)] transition-colors hover:bg-primary-500 disabled:opacity-50"
        >
          {adjBusy ? "Applying…" : "Apply adjustment"}
        </button>
      </section>

      <p className="text-[12px] text-slate-500">
        Grant admin · set{" "}
        <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          ADMIN_FIREBASE_UIDS
        </code>{" "}
        in{" "}
        <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          .env
        </code>{" "}
        (comma-separated Firebase UIDs), sign in, hit any page.
      </p>
    </div>
  );
}
