"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Generator",
    description: "Create new screenshots",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/history",
    label: "History",
    description: "Past batches",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    description: "Plans & credits",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/team",
    label: "Team",
    description: "Members & sharing",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/mcp",
    label: "MCP Auth",
    description: "Create agent token",
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21h-10.5A2.25 2.25 0 0 1 4.5 18.75v-6A2.25 2.25 0 0 1 6.75 10.5Z" />
      </svg>
    ),
  },
];

function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-[13px]";
  return (
    <span className={`relative flex ${dim} items-center justify-center rounded-xl bg-slate-900 font-semibold text-white shadow-[var(--shadow-sm)] dark:bg-slate-50 dark:text-slate-900`}>
      <span aria-hidden>S</span>
      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-surface-1 dark:ring-background" />
    </span>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOut, account, getIdToken, refreshAccount } = useAuth();
  const [workspaceBusy, setWorkspaceBusy] = useState(false);

  const setWorkspace = useCallback(
    async (ws: "personal" | "team") => {
      if (!account?.orgId || account.workspace === ws) return;
      setWorkspaceBusy(true);
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/user/workspace", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspace: ws }),
        });
        if (res.ok) await refreshAccount();
      } finally {
        setWorkspaceBusy(false);
      }
    },
    [account?.orgId, account?.workspace, getIdToken, refreshAccount]
  );

  const teamLabel = account?.orgName?.trim() || "Team";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a href="#dashboard-main" className="skip-link">
        Skip to content
      </a>

      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-hairline bg-surface-1/60 backdrop-blur-sm lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-hairline px-5">
          <Logo />
          <div className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Subvra
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              workspace
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Primary">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-200 ${
                  active
                    ? "bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-100"
                    : "text-slate-600 hover:bg-surface-2 hover:text-foreground dark:text-slate-400"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-primary-500"
                  />
                )}
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    active
                      ? "bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200"
                      : "bg-surface-2 text-slate-500 group-hover:text-foreground dark:bg-surface-3"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex flex-col leading-tight">
                  <span>{item.label}</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-hairline p-3 space-y-1">
          {account?.role === "admin" && (
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 dark:bg-surface-3">
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </span>
              Admin
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[12px] font-medium text-slate-500 transition-colors hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Back to site
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-hairline bg-surface-1/80 px-4 backdrop-blur-md sm:px-6">
          <div className="lg:hidden flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="text-sm font-semibold text-foreground">Subvra</span>
          </div>
          <div className="hidden lg:block" />

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {!loading && user && (
              <>
                {account !== null && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {account.orgId && account.workspace && (
                      <div
                        className="flex shrink-0 items-center rounded-full border border-hairline bg-surface-1 p-0.5 shadow-[var(--shadow-xs)]"
                        role="group"
                        aria-label="Switch between individual and team workspace"
                      >
                        <button
                          type="button"
                          disabled={workspaceBusy}
                          onClick={() => void setWorkspace("personal")}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                            account.workspace === "personal"
                              ? "bg-foreground text-background"
                              : "text-slate-500 hover:text-foreground"
                          }`}
                        >
                          Individual
                        </button>
                        <button
                          type="button"
                          disabled={workspaceBusy}
                          onClick={() => void setWorkspace("team")}
                          className={`max-w-[10rem] truncate rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                            account.workspace === "team"
                              ? "bg-foreground text-background"
                              : "text-slate-500 hover:text-foreground"
                          }`}
                          title={teamLabel}
                        >
                          {teamLabel}
                        </button>
                      </div>
                    )}

                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-hairline bg-surface-1 px-3 py-1.5 shadow-[var(--shadow-xs)]">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      <span
                        className="font-mono text-[12px] font-semibold tabular-nums text-foreground"
                        data-numeric
                      >
                        {account.credits}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        credits
                      </span>
                      {account.orgId && account.workspace && (
                        <span className="hidden text-[10px] text-slate-400 sm:inline">
                          · {account.workspace === "team" ? "team pool" : "personal"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="hidden h-8 w-px bg-hairline sm:block" aria-hidden />

                <span
                  className="hidden max-w-[180px] truncate text-[13px] text-slate-500 sm:block"
                  title={user.email ?? undefined}
                >
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-full border border-hairline bg-surface-1 px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-foreground dark:hover:border-slate-600"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </header>

        <main
          id="dashboard-main"
          className="flex-1 overflow-auto bg-background"
        >
          <div className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
