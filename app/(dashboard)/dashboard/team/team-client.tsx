"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";

type TeamMember = {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
};

type TeamPayload = {
  organization: {
    id: string;
    name: string;
    ownerId: string;
    teamCredits: number;
  } | null;
  members: TeamMember[];
  personalCredits: number;
  effectiveCredits: number;
  you: { role: string } | null;
  staleOrg?: boolean;
};

export function TeamClient() {
  const { getIdToken, refreshAccount } = useAuth();
  const [data, setData] = useState<TeamPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const loadTeam = useCallback(async () => {
    setError("");
    try {
      const token = await getIdToken();
      if (!token) {
        setData(null);
        setError("Sign in to manage your team.");
        return;
      }
      const res = await fetch("/api/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as TeamPayload & { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load team");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
      setData(null);
    }
  }, [getIdToken]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadTeam();
    });
  }, [loadTeam]);

  const createOrg = async () => {
    if (!orgName.trim()) return;
    setBusy("create");
    setError("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in required");
      const res = await fetch("/api/team/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not create organization");
      setOrgName("");
      await loadTeam();
      void refreshAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const deleteOrg = async () => {
    if (!confirm("Delete this organization and remove all members from the team? Org pool credits are removed.")) {
      return;
    }
    setBusy("deleteOrg");
    setError("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in required");
      const res = await fetch("/api/team/organization", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not delete");
      await loadTeam();
      void refreshAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setBusy("invite");
    setError("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in required");
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Invite failed");
      setInviteEmail("");
      await loadTeam();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Remove this member from the team?")) return;
    setBusy(`rm-${userId}`);
    setError("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in required");
      const res = await fetch(
        `/api/team/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Remove failed");
      await loadTeam();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const leaveTeam = async () => {
    if (!confirm("Leave this team? You will use your personal credits again.")) return;
    setBusy("leave");
    setError("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in required");
      const res = await fetch("/api/team/leave", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not leave");
      await loadTeam();
      void refreshAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const transfer = async () => {
    const n = Number.parseInt(transferAmount, 10);
    if (!Number.isFinite(n) || n < 1) return;
    setBusy("transfer");
    setError("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sign in required");
      const res = await fetch("/api/team/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: n }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Transfer failed");
      setTransferAmount("");
      await loadTeam();
      void refreshAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const org = data?.organization;
  const isOwner = data?.you?.role === "owner";
  const loading = data === null && !error;

  const inputCls =
    "h-11 rounded-xl border border-hairline bg-surface-1 px-3.5 text-sm text-foreground transition-[border-color] duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:hover:border-slate-600";
  const primaryCls =
    "press inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary-600 px-5 text-[13px] font-semibold text-white shadow-[var(--shadow-glow-primary)] transition-colors hover:bg-primary-500 disabled:opacity-50";
  const ghostCls =
    "press inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface-1 px-4 text-[13px] font-medium text-foreground transition-colors hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50";

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <p className="text-eyebrow mb-3 text-primary-700 dark:text-primary-400">
          Team
        </p>
        <h1 className="text-display text-[2.25rem] sm:text-[2.5rem] text-foreground">
          One pool. Everyone shipping.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
          Create an organization, fund the pool from your personal credits,
          and invite teammates. All generations across the team draw from the
          shared pool.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-danger-500/30 bg-danger-500/8 px-4 py-3 text-[13px] text-danger-600"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {data?.staleOrg && (
        <p className="rounded-2xl border border-accent-300/60 bg-accent-50 px-4 py-3 text-[13px] text-accent-700 dark:border-accent-700/50 dark:bg-accent-700/10 dark:text-accent-300">
          Your profile referenced a team that no longer exists; it was cleared.
          You can create or join a new organization below.
        </p>
      )}

      {loading && (
        <div className="rounded-3xl border border-hairline bg-surface-1 py-16 text-center" role="status" aria-busy="true">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-hairline border-t-primary-500" aria-hidden />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            Loading team
          </p>
        </div>
      )}

      {data && !org && (
        <div className="surface-tinted relative overflow-hidden rounded-3xl p-8">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary-500/12 blur-3xl" aria-hidden />
          <p className="relative text-eyebrow text-primary-700 dark:text-primary-400">
            Get started
          </p>
          <h2 className="relative mt-2 text-2xl font-semibold text-foreground">
            Create an organization
          </h2>
          <p className="relative mt-2 max-w-md text-[13px] text-slate-600 dark:text-slate-400">
            Name your team workspace. You can invite colleagues by email after
            they sign up to Subvra.
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Company or team name"
              className={`${inputCls} min-w-[220px] flex-1`}
            />
            <button
              type="button"
              disabled={busy !== null || !orgName.trim()}
              onClick={() => void createOrg()}
              className={primaryCls}
            >
              {busy === "create" ? "Creating…" : "Create organization"}
            </button>
          </div>
        </div>
      )}

      {data && org && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-3xl border border-hairline bg-surface-1 p-6">
              <p className="text-eyebrow text-slate-500">Organization</p>
              <p className="mt-3 text-xl font-semibold text-foreground">
                {org.name}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                role · {data.you?.role ?? "—"}
              </p>
            </article>
            <article className="surface-tinted relative overflow-hidden rounded-3xl p-6">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-500/15 blur-3xl" aria-hidden />
              <p className="relative text-eyebrow text-primary-700 dark:text-primary-400">
                Team pool
              </p>
              <p className="relative mt-3 font-mono text-4xl font-semibold tabular-nums text-foreground" data-numeric>
                {org.teamCredits}
              </p>
              <p className="relative mt-1 text-[12px] text-slate-500">
                shared credits across all members
              </p>
            </article>
            <article className="rounded-3xl border border-hairline bg-surface-1 p-6">
              <p className="text-eyebrow text-slate-500">Personal balance</p>
              <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-foreground" data-numeric>
                {data.personalCredits}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                top-ups land here first
              </p>
            </article>
          </div>

          {isOwner && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-hairline bg-surface-1 p-6">
                <h3 className="text-base font-semibold text-foreground">
                  Fund team pool
                </h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  Move credits from personal to shared. 1 credit = 1 screenshot.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <input
                    type="number"
                    min={1}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Amount"
                    className={`${inputCls} w-28 text-center font-mono tabular-nums`}
                    data-numeric
                  />
                  <button
                    type="button"
                    disabled={busy !== null || !transferAmount.trim()}
                    onClick={() => void transfer()}
                    className={ghostCls}
                  >
                    {busy === "transfer" ? "…" : "Transfer to pool"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-hairline bg-surface-1 p-6">
                <h3 className="text-base font-semibold text-foreground">
                  Invite member
                </h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  They must already have a Subvra account with this email.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className={`${inputCls} min-w-[220px] flex-1`}
                  />
                  <button
                    type="button"
                    disabled={busy !== null || !inviteEmail.includes("@")}
                    onClick={() => void invite()}
                    className={primaryCls}
                  >
                    {busy === "invite" ? "…" : "Send invite"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface-1">
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">
                Members
              </h3>
              <span className="font-mono text-[11px] tabular-nums text-slate-500" data-numeric>
                {data.members.length} total
              </span>
            </div>
            <ul className="divide-y divide-hairline">
              {data.members.map((m) => (
                <li
                  key={m.userId}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface-2 font-mono text-[11px] font-semibold uppercase text-slate-500">
                      {m.email.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">
                        {m.email}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        {m.role}
                      </p>
                    </div>
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void removeMember(m.userId)}
                      className="press rounded-full border border-danger-500/30 bg-danger-500/5 px-3 py-1.5 text-[11px] font-medium text-danger-600 transition-colors hover:bg-danger-500/10"
                    >
                      {busy === `rm-${m.userId}` ? "…" : "Remove"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isOwner && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void leaveTeam()}
                className={ghostCls}
              >
                {busy === "leave" ? "…" : "Leave team"}
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void deleteOrg()}
                className="press inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-danger-500/40 bg-danger-500/5 px-4 text-[13px] font-medium text-danger-600 transition-colors hover:bg-danger-500/10 disabled:opacity-50"
              >
                {busy === "deleteOrg" ? "…" : "Delete organization"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadTeam()}
              className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-medium text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}
