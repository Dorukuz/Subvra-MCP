import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { APPLE_PRESETS, type ApplePreset } from "@/lib/apple-presets";
import { debitCredits, creditRefundForGeneration } from "@/lib/credits";
import { userUsesTeamWallet } from "@/lib/workspace";
import { downloadImageBuffer, processWithDeviceFrame } from "@/lib/image-pipeline";
import { adaptScreenshotFromReference, generateImage, getOpenAIClient } from "@/lib/openai";
import { resolveAppStorePromptContext } from "@/lib/app-store-lookup";
import { COLLECTIONS, type GenerationJob } from "@/lib/db/models";
import { getDb } from "@/lib/mongodb";
import { rateLimitByUser, rateLimitByIp } from "@/lib/rate-limit";

const MAX_PROMPT_LENGTH = 2000;
const MAX_APP_STORE_URL_LENGTH = 512;
const MAX_REFERENCE_SCREENSHOTS = 3;
const MAX_REFERENCE_DATA_URL_LENGTH = 8_000_000;
/** Used when the user leaves the creative field empty and no App Store context is loaded. */
const FALLBACK_CREATIVE_BRIEF =
  "Create a polished, modern App Store marketing screen that highlights the product’s core value with clear hierarchy, attractive typography, and realistic UI suited to this device. Emphasize one compelling hero moment or primary benefit.";
/** Max distinct device presets in one request. */
const MAX_DEVICE_TYPES = 10;
/** Max screenshots billed for a single device in one request. */
const MAX_SHOTS_PER_DEVICE = 8;
/** Max total credits (successful or attempted shots) per request. */
const MAX_TOTAL_SHOTS = 48;
const VALID_DEVICE_IDS = new Set(Object.keys(APPLE_PRESETS));
const PROMPT_REWRITE_MODEL = "gpt-4o-mini";

const BASE_MAIN_PROMPT_TEMPLATE = `Using gpt-image-2-2026-04-21.

Generate an App Store screenshot creative.
If an app screenshot is attached, include that app screen in the final image composition as the central/hero app UI (do not ignore it).

Default style goals:
- Premium app aesthetic
- Crisp, readable text hierarchy
- App screen remains the central hero
- No fake UI additions
- No watermark
- No phone hardware frame/bezel/notch (flat artwork only)`;

async function buildMainCreativePrompt(
  userPromptTrimmed: string,
  hasReferenceScreenshot: boolean
): Promise<string> {
  const fallback =
    userPromptTrimmed.length > 0
      ? `${BASE_MAIN_PROMPT_TEMPLATE}\n\nUser customization:\n${userPromptTrimmed}`
      : BASE_MAIN_PROMPT_TEMPLATE;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: PROMPT_REWRITE_MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You rewrite prompts for App Store screenshot generation. Return plain text prompt only. Keep it concise, production-ready, and preserve all explicit user constraints. If screenshot input exists, the rewritten prompt must explicitly require including that screenshot/app UI in the final creative.",
        },
        {
          role: "user",
          content: `Make this the main generation prompt template, then blend the user customization into it without losing constraints.\n\nMain template:\n${BASE_MAIN_PROMPT_TEMPLATE}\n\nHas app screenshot attached (must be included in final image): ${hasReferenceScreenshot ? "yes" : "no"}\n\nUser customization:\n${userPromptTrimmed || "(none)"}`,
        },
      ],
    });
    const rewritten = completion.choices[0]?.message?.content?.trim();
    return rewritten || fallback;
  } catch (error) {
    console.warn("[api/generate] Prompt rewrite failed, using fallback template:", error);
    return fallback;
  }
}

async function withMongoRetries<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, 120 * i));
      }
    }
  }
  console.error(`[api/generate] ${label} failed after ${attempts} attempts:`, last);
  throw last;
}

function openaiSizeForPreset(
  preset: ApplePreset
): "1024x1024" | "1024x1536" | "1536x1024" {
  if (preset.height > preset.width) return "1024x1536";
  if (preset.width > preset.height) return "1536x1024";
  return "1024x1024";
}

function screenshotPrompt(
  userPromptTrimmed: string,
  preset: ApplePreset,
  appStoreBlock?: string | null,
  variation?: { index: number; total: number },
  hasReferenceScreenshot = false
): string {
  const orientation =
    preset.width > preset.height
      ? "landscape"
      : preset.height > preset.width
        ? "portrait"
        : "square";
  const targetBlock = `--- Target device spec (strict) ---
Device: ${preset.label} (${preset.family === "ipad" ? "iPad" : "iPhone"})
Target resolution: ${preset.width}x${preset.height} pixels
Target orientation: ${orientation}
Instruction: Design this image natively for this exact resolution and aspect ratio.
Instruction: Keep important UI/content inside safe visible area, but visually fill the full canvas.
Instruction: No empty margins, no white bars, no letterboxing, no plain padding bands.
---`;
  const style = `Style: high-end App Store marketing screenshot for ${preset.label}. Polished product UI, readable hierarchy, realistic lighting. Match the referenced app’s branding, tone, and feature set when App Store context is provided. Output full-bleed app or product artwork only (no phone hardware, bezel, or notch—we composite the device frame separately).`;
  const refBlock = hasReferenceScreenshot
    ? `\n\nApp screenshot is attached and must be visibly included in the final creative as the main app screen/hero UI. Keep its core UI structure, branding, and recognizability while composing for this target device.`
    : "";
  const app = appStoreBlock?.trim();
  const baseContent =
    userPromptTrimmed || (app ? "" : FALLBACK_CREATIVE_BRIEF);
  const varBlock =
    variation && variation.total > 1
      ? `\n\nVariation: this is distinct composition ${variation.index} of ${variation.total} for this device size. Use a different screen, layout, or focal feature while staying consistent with the app description above. Avoid repeating the exact same framing as the other variations.`
      : "";
  if (app) {
    const head = baseContent
      ? `${baseContent}\n\n${targetBlock}\n\n--- App context (from store listing) ---\n${app}\n---\n\n${style}`
      : `${targetBlock}\n\n--- App context (from store listing) ---\n${app}\n---\n\n${style}`;
    return `${head}${refBlock}${varBlock}`;
  }
  return `${baseContent}\n\n${targetBlock}\n\n${style}${refBlock}${varBlock}`;
}

function slotVariantKey(slot: { variantIndex?: number }): number {
  return slot.variantIndex ?? 0;
}

/** First matching slot that owns the “master” image for this variation (full generate); others adapt from it. */
function indexOfMasterSlot(
  slotList: Array<{ deviceId: string; variantIndex?: number }>,
  primaryDeviceId: string,
  vKey: number
): number {
  const primaryIdx = slotList.findIndex(
    (s) => slotVariantKey(s) === vKey && s.deviceId === primaryDeviceId
  );
  if (primaryIdx !== -1) return primaryIdx;
  return slotList.findIndex((s) => slotVariantKey(s) === vKey);
}

function adaptScreenshotPrompt(
  userPromptTrimmed: string,
  targetPreset: ApplePreset,
  masterPreset: ApplePreset,
  appStoreBlock?: string | null,
  variation?: { index: number; total: number }
): string {
  const isIpadTarget = targetPreset.family === "ipad";
  const deviceSpecific =
    isIpadTarget
      ? "This target is an iPad screenshot: adapt layout density, spacing, and UI scale for iPad while preserving the same product identity and visual story from the master image."
      : "This target is an iPhone screenshot: keep phone-oriented hierarchy and framing while preserving the same product identity and visual story from the master image.";
  const shape =
    targetPreset.height > targetPreset.width
      ? "a taller portrait canvas"
      : targetPreset.width > targetPreset.height
        ? "a wider landscape canvas"
        : "a square canvas";
  const orientation =
    targetPreset.width > targetPreset.height
      ? "landscape"
      : targetPreset.height > targetPreset.width
        ? "portrait"
        : "square";
  const targetBlock = `--- Target adaptation spec (strict) ---
Device: ${targetPreset.label} (${isIpadTarget ? "iPad" : "iPhone"})
Target resolution: ${targetPreset.width}x${targetPreset.height} pixels
Target orientation: ${orientation}
Source/master device: ${masterPreset.label}
Instruction: Recompose for this exact target device and resolution while matching the same app identity from the master image.
Instruction: No empty margins, no white bars, no letterboxing, no padding bands.
---`;
  const adapt = `Adapt the attached App Store marketing screenshot into a new full-bleed composition for ${targetPreset.label} (${targetPreset.width}x${targetPreset.height}px, ${shape}). The reference was created for ${masterPreset.label}. Keep the same app, brand, colors, typography, and story—this should read as the same product on a different screen shape. ${deviceSpecific} Reflow UI (columns, spacing, hero framing) so it feels natural for this aspect ratio and fills the whole output image. Do not leave empty margins, white bars, letterboxing, or padding at top/bottom/sides. Do not show phone hardware or bezels—flat artwork only.`;
  const varBlock =
    variation && variation.total > 1
      ? `\n\nVariation ${variation.index} of ${variation.total}: match the same variation theme as the master image for this batch.`
      : "";
  const userBit = userPromptTrimmed.trim()
    ? `\n\n--- Creative brief (stay aligned) ---\n${userPromptTrimmed.trim()}`
    : "";
  const app = appStoreBlock?.trim();
  const appBit = app ? `\n\n--- App context (store listing) ---\n${app}\n---` : "";
  return `${targetBlock}\n\n${adapt}${userBit}${appBit}${varBlock}`;
}

function normalizeReferenceScreenshots(raw: unknown): { refs: string[]; error?: string } {
  if (raw === undefined || raw === null) return { refs: [] };
  if (!Array.isArray(raw)) {
    return { refs: [], error: "referenceScreenshots must be an array of image data URLs" };
  }
  if (raw.length > MAX_REFERENCE_SCREENSHOTS) {
    return {
      refs: [],
      error: `Attach at most ${MAX_REFERENCE_SCREENSHOTS} screenshots`,
    };
  }

  const refs: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !item.startsWith("data:image/")) {
      return { refs: [], error: "Each reference screenshot must be a valid image data URL" };
    }
    if (item.length > MAX_REFERENCE_DATA_URL_LENGTH) {
      return { refs: [], error: "A reference screenshot is too large" };
    }
    refs.push(item);
  }
  return { refs };
}

type NormalizedShot = { deviceId: string; count: number };

function normalizeDeviceRequests(raw: unknown): { shots: NormalizedShot[]; error?: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { shots: [], error: "At least one device is required" };
  }

  const tallies = new Map<string, number>();

  for (const item of raw) {
    if (typeof item === "string") {
      if (!VALID_DEVICE_IDS.has(item)) {
        return { shots: [], error: `Invalid device: ${item}` };
      }
      tallies.set(item, (tallies.get(item) ?? 0) + 1);
      continue;
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { shots: [], error: "Invalid devices payload" };
    }

    const o = item as Record<string, unknown>;
    const id =
      typeof o.deviceId === "string"
        ? o.deviceId
        : typeof o.id === "string"
          ? o.id
          : null;
    if (!id || !VALID_DEVICE_IDS.has(id)) {
      return { shots: [], error: `Invalid device: ${String(id)}` };
    }

    let count = 1;
    if (o.count !== undefined && o.count !== null) {
      if (typeof o.count !== "number" || !Number.isFinite(o.count)) {
        return { shots: [], error: "Each device count must be a number" };
      }
      count = Math.floor(o.count);
    }
    if (count < 1) {
      return { shots: [], error: "Each device needs at least 1 screenshot" };
    }
    if (count > MAX_SHOTS_PER_DEVICE) {
      return {
        shots: [],
        error: `At most ${MAX_SHOTS_PER_DEVICE} screenshots per device in one batch`,
      };
    }
    tallies.set(id, (tallies.get(id) ?? 0) + count);
  }

  if (tallies.size > MAX_DEVICE_TYPES) {
    return { shots: [], error: `Maximum ${MAX_DEVICE_TYPES} device types per request` };
  }

  const shots: NormalizedShot[] = [];
  let total = 0;
  for (const [deviceId, count] of tallies) {
    total += count;
    if (total > MAX_TOTAL_SHOTS) {
      return {
        shots: [],
        error: `This batch would use ${total} credits; maximum is ${MAX_TOTAL_SHOTS} per request.`,
      };
    }
    shots.push({ deviceId, count });
  }

  return { shots };
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipLimit = await rateLimitByIp(ip, "generate", 20, 60);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.resetIn) } }
    );
  }

  let authUser;
  try {
    authUser = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userLimit = await rateLimitByUser(authUser.uid, "generate", 10, 60);
  if (!userLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before generating again." },
      { status: 429, headers: { "Retry-After": String(userLimit.resetIn) } }
    );
  }

  try {
    const body = await req.json();
    const { prompt, devices, appStoreUrl, referenceScreenshots } = body as {
      prompt?: unknown;
      devices?: unknown;
      appStoreUrl?: unknown;
      referenceScreenshots?: unknown;
    };

    if (prompt !== undefined && prompt !== null && typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt must be text" }, { status: 400 });
    }
    const promptText = typeof prompt === "string" ? prompt : "";
    if (promptText.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be under ${MAX_PROMPT_LENGTH} characters` },
        { status: 400 }
      );
    }
    const promptTrimmed = promptText.trim();

    const normalized = normalizeDeviceRequests(devices);
    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }
    const { shots } = normalized;
    const normalizedRefs = normalizeReferenceScreenshots(referenceScreenshots);
    if (normalizedRefs.error) {
      return NextResponse.json({ error: normalizedRefs.error }, { status: 400 });
    }
    const referenceImages = normalizedRefs.refs;
    const mainCreativePrompt = await buildMainCreativePrompt(
      promptTrimmed,
      referenceImages.length > 0
    );

    const rawAppStoreUrl =
      typeof appStoreUrl === "string" && appStoreUrl.trim() ? appStoreUrl.trim() : undefined;

    let appStoreBlock: string | null = null;
    if (rawAppStoreUrl) {
      if (rawAppStoreUrl.length > MAX_APP_STORE_URL_LENGTH) {
        return NextResponse.json(
          { error: `App Store URL must be under ${MAX_APP_STORE_URL_LENGTH} characters` },
          { status: 400 }
        );
      }
      appStoreBlock = await resolveAppStorePromptContext(rawAppStoreUrl);
      if (appStoreBlock === null) {
        return NextResponse.json(
          {
            error:
              "Invalid App Store link. Paste a full URL from the App Store, for example https://apps.apple.com/app/your-app/id123456789",
          },
          { status: 400 }
        );
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Image generation is not configured (missing OPENAI_API_KEY)." },
        { status: 503 }
      );
    }

    const jobId = `job_${Date.now()}_${randomBytes(4).toString("hex")}`;
    let cost = 0;
    for (const s of shots) {
      cost += s.count;
    }

    const debit = await debitCredits(
      authUser.uid,
      cost,
      `Screenshot generation (${cost} image${cost !== 1 ? "s" : ""})`,
      jobId
    );
    const debitedOrgId =
      authUser.user.orgId && userUsesTeamWallet(authUser.user)
        ? authUser.user.orgId
        : null;

    if (!debit.success) {
      return NextResponse.json(
        { error: "Insufficient credits", balance: debit.balance },
        { status: 400 }
      );
    }

    /** Flat order of shots (matches credits / device loop). */
    const slots: { deviceId: string; variantIndex?: number; variation?: { index: number; total: number } }[] = [];
    for (const { deviceId, count } of shots) {
      for (let v = 1; v <= count; v++) {
        slots.push({
          deviceId,
          variantIndex: count > 1 ? v : undefined,
          variation: count > 1 ? { index: v, total: count } : undefined,
        });
      }
    }

    const primaryDeviceId = shots[0]!.deviceId;
    const distinctDeviceTypes = new Set(slots.map((s) => s.deviceId)).size;
    const referencePngByVariant = new Map<number, Buffer>();
    const uploadedReferenceBuffers: Buffer[] = [];
    for (const ref of referenceImages) {
      try {
        uploadedReferenceBuffers.push(await downloadImageBuffer(ref));
      } catch {
        return NextResponse.json(
          { error: "Failed to decode one of the uploaded reference screenshots" },
          { status: 400 }
        );
      }
    }

    const initialDeviceRows: GenerationJob["devices"] = slots.map((s) => ({
      presetId: s.deviceId,
      variantIndex: s.variantIndex,
      status: "queued" as const,
    }));

    const results: { presetId: string; url: string; variantIndex?: number }[] = [];
    let deviceRows: GenerationJob["devices"] = [];
    let historyPersisted = false;
    let incrementalHistory = false;

    try {
      const db = await getDb();
      const now = new Date();
      await withMongoRetries(
        "job insert (start)",
        () =>
          db.collection<GenerationJob>(COLLECTIONS.generationJobs).insertOne({
            jobId,
            userId: authUser.uid,
            prompt: promptTrimmed,
            appStoreUrl: rawAppStoreUrl,
            orgId: debitedOrgId ?? undefined,
            devices: initialDeviceRows,
            creditsCharged: cost,
            status: "processing",
            createdAt: now,
            updatedAt: now,
          })
      );
      historyPersisted = true;
      incrementalHistory = true;
      deviceRows = initialDeviceRows.map((row) => ({ ...row }));
    } catch (dbErr) {
      console.error("[api/generate] Failed to persist generation job (start):", dbErr);
      deviceRows = [];
    }

    const coll = (await getDb()).collection<GenerationJob>(COLLECTIONS.generationJobs);

    async function syncJobDevices(): Promise<void> {
      if (!incrementalHistory) return;
      try {
        await coll.updateOne(
          { jobId },
          { $set: { devices: deviceRows, updatedAt: new Date() } }
        );
      } catch (e) {
        console.error("[api/generate] Failed to sync job devices:", e);
      }
    }

    for (let i = 0; i < slots.length; i++) {
      const { deviceId, variantIndex, variation } = slots[i];
      const preset = APPLE_PRESETS[deviceId];
      const startedAt = new Date();

      if (incrementalHistory) {
        deviceRows[i] = {
          presetId: deviceId,
          variantIndex,
          status: "processing",
          startedAt,
        };
        await syncJobDevices();
      }

      try {
        const vKey = slotVariantKey(slots[i]!);
        const masterIdx = indexOfMasterSlot(slots, primaryDeviceId, vKey);
        const isMaster = i === masterIdx;
        const useFullGenerate = distinctDeviceTypes < 2 || isMaster;

        let imageBuffer: Buffer;
        if (useFullGenerate) {
          const uploadedReference =
            uploadedReferenceBuffers.length > 0
              ? uploadedReferenceBuffers[
                  variation ? (variation.index - 1) % uploadedReferenceBuffers.length : 0
                ]
              : null;
          if (uploadedReference) {
            const adaptPrompt = screenshotPrompt(
              mainCreativePrompt,
              preset,
              appStoreBlock,
              variation,
              true
            );
            const { url: adaptedUrl } = await adaptScreenshotFromReference(
              uploadedReference,
              adaptPrompt,
              openaiSizeForPreset(preset)
            );
            imageBuffer = await downloadImageBuffer(adaptedUrl);
          } else {
            const { url: imageUrl } = await generateImage(
              screenshotPrompt(mainCreativePrompt, preset, appStoreBlock, variation),
              openaiSizeForPreset(preset)
            );
            imageBuffer = await downloadImageBuffer(imageUrl);
          }
          referencePngByVariant.set(vKey, imageBuffer);
        } else {
          const refBuf = referencePngByVariant.get(vKey);
          if (!refBuf) {
            throw new Error("Missing master image for this variation.");
          }
          const masterPreset = APPLE_PRESETS[slots[masterIdx]!.deviceId];
          const adaptPrompt = adaptScreenshotPrompt(
            mainCreativePrompt,
            preset,
            masterPreset,
            appStoreBlock,
            variation
          );
          const { url: adaptedUrl } = await adaptScreenshotFromReference(
            refBuf,
            adaptPrompt,
            openaiSizeForPreset(preset)
          );
          imageBuffer = await downloadImageBuffer(adaptedUrl);
        }

        const slug =
          variation != null
            ? `${jobId}_${deviceId}_${variation.index}`
            : `${jobId}_${deviceId}`;
        const publicPath = await processWithDeviceFrame(imageBuffer, preset, slug);
        const doneRow: GenerationJob["devices"][number] = {
          presetId: deviceId,
          variantIndex,
          status: "completed",
          outputUrl: publicPath,
          startedAt,
          completedAt: new Date(),
        };
        if (incrementalHistory) {
          deviceRows[i] = doneRow;
        } else {
          deviceRows.push(doneRow);
        }
        results.push({
          presetId: deviceId,
          url: publicPath,
          variantIndex,
        });
      } catch (deviceErr) {
        const msg =
          deviceErr instanceof Error ? deviceErr.message : "Image generation failed";
        console.error("[api/generate] Device generation error:", deviceId, deviceErr);
        const failRow: GenerationJob["devices"][number] = {
          presetId: deviceId,
          variantIndex,
          status: "failed",
          error: msg,
          startedAt,
          completedAt: new Date(),
        };
        if (incrementalHistory) {
          deviceRows[i] = failRow;
        } else {
          deviceRows.push(failRow);
        }
      }

      if (incrementalHistory) {
        await syncJobDevices();
      }
    }

    const completed = deviceRows.filter((d) => d.status === "completed").length;
    const refund = cost - completed;
    let balanceAfter = debit.balance;
    if (refund > 0) {
      balanceAfter = await creditRefundForGeneration(
        authUser.uid,
        refund,
        `Generation: ${completed}/${cost} image(s) succeeded`,
        debitedOrgId
      );
    }

    const jobStatus: GenerationJob["status"] =
      completed === 0 ? "failed" : completed === cost ? "completed" : "partial";

    if (incrementalHistory) {
      try {
        await coll.updateOne(
          { jobId },
          { $set: { status: jobStatus, devices: deviceRows, updatedAt: new Date() } }
        );
      } catch (e) {
        console.error("[api/generate] Failed to finalize generation job:", e);
      }
    } else {
      try {
        const db = await getDb();
        await withMongoRetries(
          "job insert (end)",
          () =>
            db.collection<GenerationJob>(COLLECTIONS.generationJobs).insertOne({
              jobId,
              userId: authUser.uid,
              prompt: promptTrimmed,
              appStoreUrl: rawAppStoreUrl,
              orgId: debitedOrgId ?? undefined,
              devices: deviceRows,
              creditsCharged: cost,
              status: jobStatus,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
        );
        historyPersisted = true;
      } catch (dbErr) {
        console.error("[api/generate] Failed to persist generation job:", dbErr);
      }
    }

    if (!historyPersisted && deviceRows.length > 0) {
      try {
        const db = await getDb();
        await withMongoRetries(
          "job insert (last-chance)",
          () =>
            db.collection<GenerationJob>(COLLECTIONS.generationJobs).insertOne({
              jobId,
              userId: authUser.uid,
              prompt: promptTrimmed,
              appStoreUrl: rawAppStoreUrl,
              orgId: debitedOrgId ?? undefined,
              devices: deviceRows,
              creditsCharged: cost,
              status: jobStatus,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
        );
        historyPersisted = true;
      } catch (e) {
        console.error("[api/generate] Last-chance job persist failed:", e);
      }
    }

    if (completed === 0) {
      const message = deviceRows[0]?.error || "Image generation failed";
      return NextResponse.json(
        {
          error: message,
          results,
          jobId,
          creditsRemaining: balanceAfter,
          historyPersisted,
        },
        { status: 502 }
      );
    }

    if (completed < cost) {
      return NextResponse.json(
        {
          error: `${cost - completed} image(s) failed`,
          results,
          jobId,
          creditsRemaining: balanceAfter,
          historyPersisted,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      jobId,
      status: "completed",
      results,
      creditsRemaining: balanceAfter,
      historyPersisted,
    });
  } catch (error) {
    console.error("[api/generate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
