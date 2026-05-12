"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Upscaler from "upscaler";
import defaultModel from "@upscalerjs/default-model";
import { useAuth } from "@/components/auth/auth-context";
import { APPLE_PRESETS, cssAspectRatioForPreset } from "@/lib/apple-presets";

const VALID_DEVICE_IDS = new Set(Object.keys(APPLE_PRESETS));

/** Mirrors server caps in `app/api/generate/route.ts`. */
const MAX_DEVICE_TYPES = 10;
const MAX_SHOTS_PER_DEVICE = 8;
const MAX_TOTAL_SHOTS = 48;
const MAX_REFERENCE_SCREENSHOTS = 3;

function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_SHOTS_PER_DEVICE, Math.max(1, Math.floor(n)));
}

export function GenerateClient() {
  const { getIdToken, refreshAccount } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [referenceScreenshots, setReferenceScreenshots] = useState<string[]>([]);
  /** Selected devices are the keys; value is screenshot count (1+ per device). */
  const [shotCounts, setShotCounts] = useState<Record<string, number>>({
    iphone_65: 1,
    ipad_13: 1,
    ipad_11: 1,
  });
  /** Selection order: first id is the creative master on the server (others adapt to match). */
  const [deviceOrder, setDeviceOrder] = useState<string[]>(["iphone_65", "ipad_13", "ipad_11"]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPerDeviceHelp, setShowPerDeviceHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [results, setResults] = useState<
    { presetId: string; url: string; variantIndex?: number }[]
  >([]);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
  const [showBlockingOverlay, setShowBlockingOverlay] = useState(false);
  const [cloneNotice, setCloneNotice] = useState("");
  const [persistNotice, setPersistNotice] = useState("");
  const [enhanceNotice, setEnhanceNotice] = useState("");
  const upscalerRef = useRef<InstanceType<typeof Upscaler> | null>(null);

  const selectedOrderedIds = useMemo(() => {
    const fromOrder = deviceOrder.filter((id) => shotCounts[id] !== undefined);
    const missing = Object.keys(shotCounts).filter((id) => !fromOrder.includes(id));
    return [...fromOrder, ...missing];
  }, [deviceOrder, shotCounts]);

  const totalCredits = useMemo(() => {
    return Object.values(shotCounts).reduce((a, n) => a + n, 0);
  }, [shotCounts]);

  const variantTotalByPreset = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of results) {
      m.set(r.presetId, (m.get(r.presetId) ?? 0) + 1);
    }
    return m;
  }, [results]);

  const toggleDevice = (id: string) => {
    setShotCounts((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) {
        delete next[id];
        setDeviceOrder((o) => o.filter((x) => x !== id));
      } else {
        if (Object.keys(next).length >= MAX_DEVICE_TYPES) return prev;
        next[id] = 1;
        setDeviceOrder((o) => (o.includes(id) ? o : [...o, id]));
      }
      return next;
    });
  };

  const setDeviceCount = (id: string, raw: number) => {
    const nextVal = clampCount(raw);
    setShotCounts((prev) => {
      if (prev[id] === undefined) return prev;
      const others = Object.entries(prev).filter(([k]) => k !== id);
      const sumOthers = others.reduce((s, [, c]) => s + c, 0);
      const maxForThis = Math.min(MAX_SHOTS_PER_DEVICE, MAX_TOTAL_SHOTS - sumOthers);
      const v = Math.min(nextVal, Math.max(1, maxForThis));
      return { ...prev, [id]: v };
    });
  };

  const fromJobParam = searchParams.get("fromJob");

  useEffect(() => {
    if (!fromJobParam) return;

    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const res = await fetch(`/api/generations/${encodeURIComponent(fromJobParam)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          setCloneNotice("Could not load that generation from history.");
          router.replace("/dashboard", { scroll: false });
          return;
        }
        const data = (await res.json()) as {
          job?: {
            prompt: string;
            appStoreUrl?: string;
            devices: { presetId: string }[];
          };
        };
        if (cancelled || !data.job) {
          router.replace("/dashboard", { scroll: false });
          return;
        }
        const { job } = data;
        setPrompt(job.prompt);
        setAppStoreUrl(job.appStoreUrl ?? "");
        const counts = new Map<string, number>();
        for (const row of job.devices) {
          const id = row.presetId;
          if (!VALID_DEVICE_IDS.has(id)) continue;
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
        const nextCounts: Record<string, number> = {};
        for (const [id, c] of counts) {
          nextCounts[id] = clampCount(c);
        }
        if (Object.keys(nextCounts).length > 0) {
          const order: string[] = [];
          for (const row of job.devices) {
            const id = row.presetId;
            if (!VALID_DEVICE_IDS.has(id) || order.includes(id)) continue;
            order.push(id);
          }
          for (const id of Object.keys(nextCounts)) {
            if (!order.includes(id)) order.push(id);
          }
          setDeviceOrder(order);
          setShotCounts(nextCounts);
          if (Object.keys(nextCounts).some((id) => APPLE_PRESETS[id]?.advanced)) {
            setShowAdvanced(true);
          }
        }
        setCloneNotice(
          "Loaded prompt, App Store link, and devices from that history entry. Edit anything, then generate."
        );
        router.replace("/dashboard", { scroll: false });
      } catch {
        if (!cancelled) {
          setCloneNotice("Could not load style from history.");
          router.replace("/dashboard", { scroll: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fromJobParam, getIdToken, router]);

  useEffect(() => {
    const shouldLockBody = Boolean(lightbox) || (loading && showBlockingOverlay);
    if (!shouldLockBody) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    if (lightbox) window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (lightbox) window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, loading, showBlockingOverlay]);

  const handleGenerate = async () => {
    if (selectedOrderedIds.length === 0) {
      setError("Select at least one device");
      return;
    }
    if (selectedOrderedIds.length > MAX_DEVICE_TYPES) {
      setError(`Choose at most ${MAX_DEVICE_TYPES} device types`);
      return;
    }
    if (totalCredits > MAX_TOTAL_SHOTS) {
      setError(`This batch would use ${totalCredits} credits; maximum is ${MAX_TOTAL_SHOTS}.`);
      return;
    }

    const bodyPrompt = prompt.trim();
    const bodyAppStore = appStoreUrl.trim();
    const bodyDevices = selectedOrderedIds.map((deviceId) => {
      const c = clampCount(shotCounts[deviceId] ?? 1);
      return c === 1 ? { deviceId } : { deviceId, count: c };
    });

    setError("");
    setShowBlockingOverlay(true);
    setLoading(true);
    setGeneratingCount(totalCredits);
    setResults([]);
    setCloneNotice("");
    setPersistNotice("");
    setEnhanceNotice("");

    setPrompt("");
    setAppStoreUrl("");

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("You need to be signed in to generate screenshots.");
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: bodyPrompt,
          devices: bodyDevices,
          ...(referenceScreenshots.length > 0
            ? { referenceScreenshots }
            : {}),
          ...(bodyAppStore ? { appStoreUrl: bodyAppStore } : {}),
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        results?: { presetId: string; url: string; variantIndex?: number }[];
        historyPersisted?: boolean;
      };

      if (data.historyPersisted === false) {
        setPersistNotice(
          "Screenshots were generated but could not be saved to your history (database unreachable). Start MongoDB or check MONGODB_URI—runs will still use credits."
        );
      } else {
        setPersistNotice("");
      }

      if (!response.ok) {
        if (Array.isArray(data.results) && data.results.length > 0) {
          setResults(data.results);
        }
        throw new Error(data.error || "Generation failed");
      }

      const serverResults = data.results || [];
      setResults(serverResults);

      if (serverResults.length > 0) {
        setEnhancing(true);
        setEnhanceProgress(0);
        try {
          if (!upscalerRef.current) {
            upscalerRef.current = new Upscaler({ model: defaultModel });
          }

          const upscaler = upscalerRef.current;
          if (!upscaler) {
            throw new Error("Upscaler unavailable");
          }

          const enhanced: { presetId: string; url: string; variantIndex?: number }[] = [];
          for (let i = 0; i < serverResults.length; i++) {
            const row = serverResults[i]!;
            try {
              const upscaled = await upscaler.upscale(row.url, {
                output: "base64",
                patchSize: 96,
                padding: 4,
              });
              enhanced.push({ ...row, url: upscaled });
            } catch {
              enhanced.push(row);
            }
            setEnhanceProgress(i + 1);
          }

          setResults(enhanced);
          if (enhanced.some((r, i) => r.url === serverResults[i]?.url)) {
            setEnhanceNotice(
              "Some previews could not be upscaled in browser and are shown in original quality."
            );
          } else {
            setEnhanceNotice("Browser AI upscale applied to all previews.");
          }
        } catch {
          setEnhanceNotice(
            "Browser AI upscale is unavailable on this device/browser. Showing original renders."
          );
        } finally {
          setEnhancing(false);
        }
      }
      void refreshAccount();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
    } finally {
      setShowBlockingOverlay(false);
      setLoading(false);
      setGeneratingCount(0);
      setEnhanceProgress(0);
    }
  };

  const presets = Object.values(APPLE_PRESETS);
  const visiblePresets = showAdvanced ? presets : presets.filter((p) => !p.advanced);
  const masterPresetId = selectedOrderedIds[0];
  const hasReferenceShots = referenceScreenshots.length > 0;

  const onReferenceScreenshotsChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_REFERENCE_SCREENSHOTS);
    if (files.length === 0) {
      setReferenceScreenshots([]);
      return;
    }
    const urls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("Failed to read screenshot file."));
            reader.readAsDataURL(file);
          })
      )
    );
    setReferenceScreenshots(urls.filter(Boolean));
    e.target.value = "";
  };

  return (
    <div className="mx-auto max-w-5xl">
      {loading && (
        <div className="sticky top-3 z-40 mb-4">
          <div
            className="relative overflow-hidden rounded-2xl border border-primary-300/50 bg-primary-50/95 px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur supports-[backdrop-filter]:bg-primary-50/80 dark:border-primary-700/50 dark:bg-slate-900/90"
            role="status"
            aria-live="polite"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="h-full w-[42%] -translate-x-full animate-[subvra-shine_1.8s_linear_infinite] bg-gradient-to-r from-transparent via-primary-500/15 to-transparent" />
            </div>
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-500" />
                </span>
                <p className="truncate text-[13px] font-semibold text-primary-900 dark:text-primary-200">
                  Generating screenshots...
                </p>
              </div>
              <p className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-primary-700 dark:text-primary-300" data-numeric>
                {generatingCount}
              </p>
            </div>
          </div>
        </div>
      )}

      <header className="mb-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="text-eyebrow mb-3 text-primary-700 dark:text-primary-400">
            Generator
          </p>
          <h1 className="text-display text-[2.5rem] sm:text-[3rem] lg:text-[3.5rem] text-foreground">
            Make every screen{" "}
            <span className="italic font-light text-primary-600 dark:text-primary-400">
              feel like
            </span>{" "}
            the same app.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            Pick devices, dial in the brief if you want, and ship a consistent
            App Store set in one batch. The first device you select becomes the
            master composition; every other size adapts to match.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 self-start rounded-2xl border border-hairline bg-surface-1 px-5 py-4 shadow-[var(--shadow-sm)] md:self-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Devices
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground" data-numeric>
              {selectedOrderedIds.length}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Shots
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground" data-numeric>
              {totalCredits}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Cap
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-400" data-numeric>
              {MAX_TOTAL_SHOTS}
            </p>
          </div>
        </div>
      </header>

      {cloneNotice && (
        <div
          className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-hairline bg-surface-2 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <div className="flex items-start gap-2.5 pr-4">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="leading-relaxed">{cloneNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setCloneNotice("")}
            className="shrink-0 rounded-full border border-hairline bg-surface-1 px-3 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {persistNotice && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-accent-300/60 bg-accent-50 px-4 py-3 text-sm text-accent-700 dark:border-accent-700/50 dark:bg-accent-700/10 dark:text-accent-300">
          <p className="pr-4 leading-relaxed">{persistNotice}</p>
          <button
            type="button"
            onClick={() => setPersistNotice("")}
            className="shrink-0 rounded-full border border-accent-300/80 bg-white/60 px-3 py-1 text-[11px] font-medium hover:bg-white dark:border-accent-700/60 dark:bg-transparent"
          >
            Dismiss
          </button>
        </div>
      )}

      {enhanceNotice && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-primary-300/60 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-700/50 dark:bg-primary-900/20 dark:text-primary-200">
          <p className="pr-4 leading-relaxed">{enhanceNotice}</p>
          <button
            type="button"
            onClick={() => setEnhanceNotice("")}
            className="shrink-0 rounded-full border border-primary-300/80 bg-white/60 px-3 py-1 text-[11px] font-medium hover:bg-white dark:border-primary-700/60 dark:bg-transparent"
          >
            Dismiss
          </button>
        </div>
      )}

      <section
        className="rounded-3xl border border-hairline bg-surface-1 p-6 shadow-[var(--shadow-sm)] sm:p-8"
        aria-busy={loading}
      >
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Step 01
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                Optional context
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                Drop your App Store URL or write a brief — both, either, or neither.
              </p>
            </div>
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="app-store-url"
                  className="mb-2 block text-[13px] font-medium text-foreground"
                >
                  App Store link
                  <span className="ml-2 font-normal text-slate-500">optional</span>
                </label>
                <input
                  id="app-store-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  value={appStoreUrl}
                  onChange={(e) => setAppStoreUrl(e.target.value)}
                  placeholder="https://apps.apple.com/.../id123456789"
                  className="h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-sm text-foreground transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:hover:border-slate-600"
                />
                <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                  Pulls title, subtitle, description, and category into the prompt
                  so screenshots stay on-brand.
                </p>
              </div>

              <div>
                <label
                  htmlFor="prompt"
                  className="mb-2 block text-[13px] font-medium text-foreground"
                >
                  Creative direction
                  <span className="ml-2 font-normal text-slate-500">optional</span>
                </label>
                <textarea
                  id="prompt"
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Example: a calm finance dashboard with spending by category, soft gradients, big type, and emphasis on savings goals…"
                  className="w-full rounded-xl border border-hairline bg-surface-2 px-3.5 py-3 text-sm text-foreground transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:hover:border-slate-600"
                />
                <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                  Empty + App Store link → listing leads. Empty + nothing →
                  built-in App Store-style brief.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reference-screenshots"
                  className="mb-2 block text-[13px] font-medium text-foreground"
                >
                  App screenshot(s) to include
                  <span className="ml-2 font-normal text-slate-500">optional</span>
                </label>
                <input
                  id="reference-screenshots"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={onReferenceScreenshotsChange}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-hairline file:bg-surface-2 file:px-3 file:py-1.5 file:text-[12px] file:font-medium hover:file:border-slate-300 dark:text-slate-300 dark:hover:file:border-slate-600"
                />
                <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                  Upload up to {MAX_REFERENCE_SCREENSHOTS} screenshots. We will include this app
                  screen in the generated creative (hero device/screen), not only use it as
                  reference.
                  {hasReferenceShots
                    ? ` ${referenceScreenshots.length} attached.`
                    : " No screenshots attached."}
                </p>
                {hasReferenceShots && (
                  <button
                    type="button"
                    onClick={() => setReferenceScreenshots([])}
                    className="mt-2 rounded-full border border-hairline bg-surface-1 px-3 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:text-foreground"
                  >
                    Clear screenshots
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="hairline h-px" aria-hidden />

          <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Step 02
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                Devices
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                Order matters. The first one you tap becomes the master.
              </p>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {showAdvanced ? "Hide advanced sizes" : "Show advanced sizes"}
                <svg className={`h-3 w-3 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                {visiblePresets.map((preset) => {
                  const selected = shotCounts[preset.id] !== undefined;
                  const isMaster = selected && preset.id === masterPresetId;
                  const atCap = !selected && Object.keys(shotCounts).length >= MAX_DEVICE_TYPES;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={atCap}
                      onClick={() => toggleDevice(preset.id)}
                      title={atCap ? `Maximum ${MAX_DEVICE_TYPES} device types` : undefined}
                      className={`group press relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-[background,border-color,color] duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected
                          ? "border-foreground/90 bg-foreground text-background"
                          : "border-hairline bg-surface-1 text-slate-600 hover:border-slate-400 hover:text-foreground dark:hover:border-slate-600"
                      }`}
                    >
                      {isMaster && (
                        <span className="absolute -top-1.5 left-3 rounded-full bg-primary-600 px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wider text-white">
                          Master
                        </span>
                      )}
                      <span aria-hidden className="text-base">
                        {preset.family === "iphone" ? "▣" : "▥"}
                      </span>
                      <span>{preset.label}</span>
                      <span className={`font-mono text-[10px] tabular-nums ${selected ? "opacity-70" : "text-slate-400"}`} data-numeric>
                        {preset.width}×{preset.height}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedOrderedIds.length > 0 && (
                <div className="mt-6 rounded-2xl border border-hairline bg-surface-2 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[13px] font-semibold text-foreground">
                      Per-device shots
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPerDeviceHelp(!showPerDeviceHelp)}
                      className="text-[12px] font-medium text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      {showPerDeviceHelp ? "Hide" : "Why use this?"}
                    </button>
                  </div>
                  {showPerDeviceHelp && (
                    <p className="mb-4 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                      Use <span className="font-mono">1</span> for a single hero shot. Raise the number to get
                      multiple distinct layouts (onboarding, paywall, settings, etc.) in one batch sharing the
                      same brief.
                    </p>
                  )}
                  <ul className="divide-y divide-hairline">
                    {selectedOrderedIds.map((id, idx) => {
                      const preset = APPLE_PRESETS[id];
                      const count = shotCounts[id] ?? 1;
                      const othersSum = totalCredits - count;
                      const maxForRow = Math.min(
                        MAX_SHOTS_PER_DEVICE,
                        MAX_TOTAL_SHOTS - othersSum
                      );
                      return (
                        <li
                          key={id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-1 font-mono text-[11px] font-semibold text-slate-500">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-foreground">
                                {preset.label}
                                {idx === 0 && (
                                  <span className="ml-2 rounded-full bg-primary-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                                    Master
                                  </span>
                                )}
                              </p>
                              <p className="font-mono text-[11px] tabular-nums text-slate-500" data-numeric>
                                {preset.width}×{preset.height} ·{" "}
                                {count === 1 ? "1 shot" : `${count} variations`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={count}
                              onChange={(e) => setDeviceCount(id, Number(e.target.value))}
                              aria-label={`Shots for ${preset.label}`}
                              className="w-16 rounded-lg border border-hairline bg-surface-1 px-2 py-1 text-center font-mono text-sm tabular-nums text-foreground transition-[border-color] duration-200 hover:border-slate-300 focus:border-primary-500 focus:outline-none dark:hover:border-slate-600"
                              data-numeric
                            >
                              {Array.from({ length: Math.max(1, maxForRow) }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                            <span className="font-mono text-[10px] text-slate-400">/ {maxForRow}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-danger-500/30 bg-danger-500/8 px-4 py-3 text-[13px] text-danger-600"
            >
              <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div className="hairline h-px" aria-hidden />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-[13px] text-slate-500">
              <p>
                <span className="font-mono text-base font-semibold tabular-nums text-foreground" data-numeric>
                  {totalCredits}
                </span>{" "}
                credit{totalCredits !== 1 ? "s" : ""} ·{" "}
                <span className="font-mono tabular-nums text-foreground" data-numeric>
                  {selectedOrderedIds.length}
                </span>{" "}
                device{selectedOrderedIds.length !== 1 ? "s" : ""}
              </p>
              {totalCredits >= MAX_TOTAL_SHOTS - 4 && (
                <p className="mt-1 text-[11px] text-accent-700 dark:text-accent-300">
                  Near batch limit ({MAX_TOTAL_SHOTS} max).
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={
                loading ||
                selectedOrderedIds.length === 0 ||
                totalCredits < 1 ||
                totalCredits > MAX_TOTAL_SHOTS
              }
              className="press shine-on-hover relative inline-flex h-12 items-center gap-2 rounded-full bg-primary-600 px-7 text-[14px] font-semibold text-white shadow-[var(--shadow-glow-primary)] transition-[background,box-shadow] duration-200 hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>
                    Rendering {generatingCount} image{generatingCount !== 1 ? "s" : ""}…
                  </span>
                </>
              ) : (
                <>
                  <span>Generate</span>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <div
          className="relative mt-6 overflow-hidden rounded-2xl border border-hairline bg-surface-2 p-5"
          role="status"
          aria-live="polite"
        >
          <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
            <div className="h-full w-1/3 animate-[subvra-shine_1.6s_var(--ease-in-out)_infinite] bg-gradient-to-r from-transparent via-primary-500 to-transparent" />
          </div>
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="h-full w-[45%] -translate-x-full animate-[subvra-shine_2s_linear_infinite] bg-gradient-to-r from-transparent via-primary-500/10 to-transparent" />
          </div>
          <div className="flex items-start gap-3">
            <span className="relative mt-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Compositing your App Store set
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                Rendering{" "}
                <span className="font-mono font-semibold tabular-nums text-foreground" data-numeric>
                  {generatingCount}
                </span>{" "}
                image{generatingCount !== 1 ? "s" : ""}. Larger batches can take a minute.
                Results appear below and are saved to History.
              </p>
              <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <section className="mt-6" aria-hidden="true">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-medium text-slate-500">Preparing previews...</p>
            <p className="font-mono text-[11px] text-slate-400" data-numeric>
              {generatingCount} queued
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: Math.max(1, generatingCount) }).map((_, idx) => (
              <div
                key={`loading-card-${idx}`}
                className="relative overflow-hidden rounded-2xl border border-hairline bg-surface-1 p-3"
              >
                <div className="aspect-[9/19.5] w-full animate-pulse rounded-xl bg-surface-3" />
                <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-surface-3" />
                <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-surface-3" />
                <div className="pointer-events-none absolute inset-0">
                  <div className="h-full w-[35%] -translate-x-full animate-[subvra-shine_1.8s_linear_infinite] bg-gradient-to-r from-transparent via-white/35 to-transparent dark:via-white/10" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-eyebrow text-primary-700 dark:text-primary-400">
                Output
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">
                Your screenshots
              </h2>
            </div>
            <p className="text-[12px] text-slate-500">
              {results.length} image{results.length !== 1 ? "s" : ""} · click to expand
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r, idx) => {
              const preset = APPLE_PRESETS[r.presetId];
              const nInPreset = variantTotalByPreset.get(r.presetId) ?? 1;
              const showVar = r.variantIndex != null && nInPreset > 1;
              const labelExtra = showVar ? ` · ${r.variantIndex} of ${nInPreset}` : "";
              const key = `${r.presetId}-${r.variantIndex ?? idx}-${idx}`;
              return (
                <article
                  key={key}
                  className="group flex flex-col rounded-2xl border border-hairline bg-surface-1 p-3 shadow-[var(--shadow-xs)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        url: r.url,
                        label: `${preset?.label || r.presetId}${labelExtra}`,
                      })
                    }
                    className="block w-full text-left"
                  >
                    <div
                      className="relative overflow-hidden rounded-xl bg-surface-3 ring-1 ring-inset ring-black/5 dark:ring-white/5"
                      style={{ aspectRatio: cssAspectRatioForPreset(r.presetId) }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.url}
                        alt={`${preset?.label ?? r.presetId} screenshot`}
                        className="h-full w-full cursor-zoom-in object-contain transition-transform duration-500 ease-out group-hover:scale-[1.015]"
                      />
                      <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums text-background opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100" data-numeric>
                        {preset?.width}×{preset?.height}
                      </span>
                    </div>
                  </button>
                  <div className="mt-3 flex items-center justify-between gap-2 px-1 pb-1">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">
                        {preset?.label}
                        {showVar && (
                          <span className="ml-1.5 font-mono text-[11px] font-normal tabular-nums text-slate-500" data-numeric>
                            {r.variantIndex}/{nInPreset}
                          </span>
                        )}
                      </p>
                    </div>
                    <a
                      href={r.url}
                      download
                      className="press inline-flex shrink-0 items-center gap-1 rounded-full border border-hairline bg-surface-1 px-3 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-foreground dark:hover:border-slate-600"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      PNG
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-md fade-up"
          role="dialog"
          aria-modal="true"
          aria-label={`Full screen preview: ${lightbox.label}`}
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

      {loading && showBlockingOverlay && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary-300/40 bg-surface-1 p-6 shadow-[var(--shadow-lg)]"
            role="status"
            aria-live="polite"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="h-full w-[45%] -translate-x-full animate-[subvra-shine_1.8s_linear_infinite] bg-gradient-to-r from-transparent via-primary-500/10 to-transparent" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-500" />
                </span>
                <p className="text-sm font-semibold text-foreground">Generating your screenshots</p>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                {enhancing ? "Upscaling in your browser: " : "We are rendering "}
                <span className="font-mono font-semibold tabular-nums text-foreground" data-numeric>
                  {enhancing ? enhanceProgress : generatingCount}
                </span>{" "}
                /{" "}
                <span className="font-mono font-semibold tabular-nums text-foreground" data-numeric>
                  {generatingCount}
                </span>{" "}
                image{generatingCount !== 1 ? "s" : ""}. Stay here or continue working while this runs.
              </p>
              <button
                type="button"
                onClick={() => setShowBlockingOverlay(false)}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-hairline bg-surface-2 px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-3"
              >
                Continue in background
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
