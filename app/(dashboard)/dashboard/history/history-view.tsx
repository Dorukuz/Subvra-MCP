"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { APPLE_PRESETS, cssAspectRatioForPreset } from "@/lib/apple-presets";

function jobIsInProgress(job: {
  status: string;
  devices: { status: string }[];
}): boolean {
  if (job.status === "processing" || job.status === "queued") return true;
  return job.devices.some((d) => d.status === "queued" || d.status === "processing");
}

function jobProgress(job: { devices: { status: string }[] }): { done: number; total: number } {
  const total = job.devices.length;
  const done = job.devices.filter((d) => d.status === "completed" || d.status === "failed").length;
  return { done, total };
}

type HistoryDevice = {
  presetId: string;
  variantIndex?: number;
  status: string;
  outputUrl?: string;
  error?: string;
};

type HistoryJob = {
  jobId: string;
  prompt: string;
  appStoreUrl?: string;
  status: string;
  creditsCharged: number;
  createdAt: string;
  updatedAt?: string;
  devices: HistoryDevice[];
};

function StatusBadge({ status, inProgress }: { status: string; inProgress: boolean }) {
  if (inProgress) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary-700 dark:text-primary-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-50" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-500" />
        </span>
        Running
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger-500/30 bg-danger-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-danger-600">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      Done
    </span>
  );
}

export function HistoryView() {
  const { getIdToken, account } = useAuth();
  const [jobs, setJobs] = useState<HistoryJob[] | null>(null);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const token = await getIdToken();
      if (!token) {
        setJobs([]);
        setError("Sign in to see your history.");
        return;
      }
      const scope =
        account?.orgId && account.workspace
          ? `?scope=${account.workspace === "personal" ? "personal" : "team"}`
          : "";
      const res = await fetch(`/api/generations${scope}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { jobs?: HistoryJob[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not load history");
      }
      setJobs(data.jobs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history");
      setJobs([]);
    }
  }, [getIdToken, account]);

  const hasInProgress = useMemo(
    () => (jobs ?? []).some((j) => jobIsInProgress(j)),
    [jobs]
  );

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!hasInProgress) return;
    const t = window.setInterval(() => {
      void load();
    }, 3000);
    return () => window.clearInterval(t);
  }, [hasInProgress, load]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  const empty = jobs && jobs.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-eyebrow mb-3 text-primary-700 dark:text-primary-400">
            History
          </p>
          <h1 className="text-display text-[2.25rem] sm:text-[2.5rem] text-foreground">
            Every batch, every shot.
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
            {account?.orgId && account.workspace ? (
              <>
                {account.workspace === "team"
                  ? "Team feed — every run that drew from the shared pool."
                  : "Yours — every batch you generated, individual or team. Switch in the header to see the team feed."}
              </>
            ) : (
              <>
                Past batches and screenshots are stored after each generate.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasInProgress && (
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-500" />
              </span>
              auto-refresh
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="press inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-1 px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-slate-300 dark:hover:border-slate-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-danger-500/30 bg-danger-500/8 px-4 py-3 text-[13px] text-danger-600"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {jobs === null && !error && (
        <div className="rounded-3xl border border-hairline bg-surface-1 py-20 text-center" role="status" aria-busy="true">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-hairline border-t-primary-500" aria-hidden="true" />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            Loading history
          </p>
        </div>
      )}

      {empty && (
        <div className="rounded-3xl border border-dashed border-hairline bg-surface-1 px-6 py-20 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-hairline bg-surface-2">
            <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.4" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground">No history yet</h3>
          <p className="mt-2 text-[13px] text-slate-500">
            Generate screenshots from the dashboard — they will be archived here.
          </p>
          <Link
            href="/dashboard"
            className="press mt-6 inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-glow-primary)] transition-colors hover:bg-primary-500"
          >
            Open generator
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="space-y-6">
          {jobs.map((job) => {
            const inProgress = jobIsInProgress(job);
            const { done, total } = jobProgress(job);
            return (
              <article
                key={job.jobId}
                className="overflow-hidden rounded-3xl border border-hairline bg-surface-1 shadow-[var(--shadow-xs)] transition-shadow duration-300 hover:shadow-[var(--shadow-sm)]"
              >
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-6 py-4">
                  <div className="min-w-0 flex flex-wrap items-center gap-2.5">
                    <StatusBadge status={job.status} inProgress={inProgress} />
                    <time className="font-mono text-[11px] tabular-nums text-slate-500" data-numeric>
                      {new Date(job.createdAt).toLocaleString()}
                    </time>
                    {inProgress && (
                      <span className="font-mono text-[11px] tabular-nums text-slate-500" data-numeric>
                        {done}/{total}
                      </span>
                    )}
                    <span className="font-mono text-[11px] tabular-nums text-slate-500" data-numeric>
                      · {job.creditsCharged}c
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <code className="hidden max-w-[10rem] truncate rounded-md bg-surface-2 px-2 py-1 font-mono text-[10px] text-slate-500 sm:block" data-numeric>
                      {job.jobId}
                    </code>
                    <Link
                      href={`/dashboard?fromJob=${encodeURIComponent(job.jobId)}`}
                      className="press inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[11px] font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Reuse
                    </Link>
                  </div>
                </header>

                <div className="px-6 pt-5">
                  <p className="line-clamp-3 text-[13px] leading-relaxed text-foreground/90">
                    {job.prompt.trim() ? (
                      job.prompt
                    ) : (
                      <span className="italic text-slate-500">
                        (no creative brief — used App Store listing or default)
                      </span>
                    )}
                  </p>
                  {job.appStoreUrl && (
                    <a
                      href={job.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 truncate font-mono text-[11px] text-primary-700 hover:underline dark:text-primary-400"
                    >
                      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                      </svg>
                      {job.appStoreUrl}
                    </a>
                  )}
                </div>

                <div className="px-6 pb-6 pt-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {job.devices.map((d, dIdx) => {
                      const preset = APPLE_PRESETS[d.presetId];
                      const nSame = job.devices.filter((x) => x.presetId === d.presetId).length;
                      const label =
                        preset?.label ??
                        d.presetId + (d.variantIndex != null && nSame > 1 ? ` (${d.variantIndex})` : "");

                      if (d.status === "queued" || d.status === "processing") {
                        return (
                          <div
                            key={`${job.jobId}-${d.presetId}-${d.variantIndex ?? dIdx}-${dIdx}`}
                            className="rounded-2xl border border-dashed border-hairline bg-surface-2 p-3"
                          >
                            <div
                              className="relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-surface-3"
                              style={{ aspectRatio: cssAspectRatioForPreset(d.presetId) }}
                            >
                              {d.status === "processing" && (
                                <div
                                  className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,oklch(0.56_0.180_265/0.10)_50%,transparent_70%)] bg-[length:200%_100%]"
                                  style={{ animation: "subvra-shine 1.6s ease-in-out infinite" }}
                                  aria-hidden
                                />
                              )}
                              <span className="relative flex h-6 w-6 items-center justify-center">
                                {d.status === "processing" ? (
                                  <svg className="h-6 w-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24" aria-hidden>
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <span className="font-mono text-base text-slate-400" aria-hidden>◷</span>
                                )}
                              </span>
                              <span className="relative font-mono text-[10px] uppercase tracking-wider text-slate-500">
                                {d.status === "processing" ? "rendering" : "queued"}
                              </span>
                            </div>
                            <p className="mt-2 truncate text-center text-[12px] font-medium text-foreground">
                              {label}
                            </p>
                          </div>
                        );
                      }

                      if (d.status === "completed" && d.outputUrl) {
                        return (
                          <div
                            key={`${job.jobId}-${d.presetId}-${d.variantIndex ?? dIdx}-${dIdx}`}
                            className="group rounded-2xl border border-hairline bg-surface-1 p-3 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                          >
                            <button
                              type="button"
                              onClick={() => setLightbox({ url: d.outputUrl!, label })}
                              className="block w-full text-left"
                            >
                              <div
                                className="relative overflow-hidden rounded-xl bg-surface-3 ring-1 ring-inset ring-black/5 dark:ring-white/5"
                                style={{ aspectRatio: cssAspectRatioForPreset(d.presetId) }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={d.outputUrl}
                                  alt={`${label} screenshot`}
                                  className="h-full w-full cursor-zoom-in object-contain transition-transform duration-500 group-hover:scale-[1.015]"
                                />
                              </div>
                            </button>
                            <div className="mt-3 flex items-center justify-between gap-2 px-1">
                              <p className="truncate text-[12px] font-semibold text-foreground">
                                {label}
                              </p>
                              <a
                                href={d.outputUrl}
                                download
                                className="press inline-flex shrink-0 items-center gap-1 rounded-full border border-hairline bg-surface-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-foreground dark:hover:border-slate-600"
                              >
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                PNG
                              </a>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${job.jobId}-${d.presetId}-fail-${dIdx}`}
                          className="rounded-2xl border border-danger-500/25 bg-danger-500/5 p-4"
                        >
                          <div className="flex items-start gap-2">
                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-foreground">
                                {label}
                              </p>
                              <p className="mt-1 text-[12px] text-danger-600">
                                {d.error || "Failed"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-md fade-up"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview: ${lightbox.label}`}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-3 text-white">
            <p className="truncate text-[13px] font-medium">{lightbox.label}</p>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="press rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium hover:bg-white/10"
            >
              Close
            </button>
          </div>
          <button
            type="button"
            className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8"
            onClick={() => setLightbox(null)}
            aria-label="Close preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt=""
              className="max-h-[calc(100vh-5rem)] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </button>
          <p className="shrink-0 pb-4 text-center font-mono text-[11px] text-white/50">
            click outside the image or press Esc to close
          </p>
        </div>
      )}
    </div>
  );
}
