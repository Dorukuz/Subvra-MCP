const LOOKUP_TIMEOUT_MS = 12_000;
const MAX_DESCRIPTION_IN_PROMPT = 1_200;

export interface AppStoreBrief {
  trackName: string;
  artistName: string;
  description: string;
  primaryGenreName?: string;
  genres?: string[];
  bundleId?: string;
  trackViewUrl?: string;
}

/**
 * Parse numeric App / iOS app id from common App Store URLs (apps.apple.com, itunes.apple.com).
 */
export function extractItunesAppId(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const href = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (
      !(
        host === "apps.apple.com" ||
        host === "itunes.apple.com" ||
        host.endsWith(".itunes.apple.com")
      )
    ) {
      return null;
    }
    const fromPath = url.pathname.match(/\/id(\d+)(?:\/|$)/i);
    if (fromPath) return Number.parseInt(fromPath[1], 10);
    const idParam = url.searchParams.get("id");
    if (idParam && /^\d+$/.test(idParam)) return Number.parseInt(idParam, 10);
  } catch {
    return null;
  }
  return null;
}

export async function lookupAppStoreById(appId: number): Promise<AppStoreBrief | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(String(appId))}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { resultCount?: number; results?: unknown[] };
    const r = data?.results?.[0] as Record<string, unknown> | undefined;
    if (!r || typeof r !== "object") return null;
    const kind = r.kind;
    if (kind !== "software" && kind !== "mac-software") return null;
    const description =
      typeof r.description === "string"
        ? r.description
        : typeof r.summary === "string"
          ? r.summary
          : "";
    return {
      trackName: typeof r.trackName === "string" ? r.trackName : "Unknown app",
      artistName: typeof r.artistName === "string" ? r.artistName : "",
      description,
      primaryGenreName:
        typeof r.primaryGenreName === "string" ? r.primaryGenreName : undefined,
      genres: Array.isArray(r.genres) ? r.genres.filter((g): g is string => typeof g === "string") : undefined,
      bundleId: typeof r.bundleId === "string" ? r.bundleId : undefined,
      trackViewUrl: typeof r.trackViewUrl === "string" ? r.trackViewUrl : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function formatAppContext(brief: AppStoreBrief, originalUrl: string): string {
  const lines: string[] = [];
  lines.push(`App (App Store): ${brief.trackName}`);
  if (brief.artistName) lines.push(`Developer: ${brief.artistName}`);
  if (brief.primaryGenreName) lines.push(`Category: ${brief.primaryGenreName}`);
  if (brief.genres?.length) {
    lines.push(`Genres: ${brief.genres.slice(0, 6).join(", ")}`);
  }
  if (brief.bundleId) lines.push(`Bundle ID: ${brief.bundleId}`);
  const desc = brief.description.replace(/\s+/g, " ").trim();
  if (desc) {
    const clipped =
      desc.length > MAX_DESCRIPTION_IN_PROMPT
        ? `${desc.slice(0, MAX_DESCRIPTION_IN_PROMPT)}…`
        : desc;
    lines.push(`Store description (for visual style, tone, and key features): ${clipped}`);
  }
  lines.push(`Listing: ${brief.trackViewUrl || originalUrl.trim()}`);
  return lines.join("\n");
}

export function appStoreMetadataUnavailableNote(url: string): string {
  return `App Store URL (could not load listing metadata; infer branding from URL only): ${url.trim()}`;
}

/**
 * Builds a text block to inject into the image prompt. Returns null if the URL is not a valid App Store link.
 */
export async function resolveAppStorePromptContext(appStoreUrl: string): Promise<string | null> {
  const id = extractItunesAppId(appStoreUrl);
  if (id === null) return null;
  const brief = await lookupAppStoreById(id);
  if (!brief) return appStoreMetadataUnavailableNote(appStoreUrl);
  return formatAppContext(brief, appStoreUrl);
}
