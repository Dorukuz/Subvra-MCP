import type { Filter } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { COLLECTIONS, type GenerationJob, type User } from "@/lib/db/models";
import { getDb } from "@/lib/mongodb";

const MAX_ITEMS = 100;

function resolveListScope(
  orgId: string | undefined,
  workspace: User["workspace"],
  param: string | null
): "team" | "personal" {
  if (param === "team" || param === "personal") return param;
  if (!orgId) return "personal";
  return workspace === "personal" ? "personal" : "team";
}

export async function GET(req: NextRequest) {
  let authUser;
  try {
    authUser = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = resolveListScope(
    authUser.user.orgId,
    authUser.user.workspace,
    req.nextUrl.searchParams.get("scope")
  );

  let filter: Filter<GenerationJob>;
  if (!authUser.user.orgId) {
    filter = { userId: authUser.uid };
  } else if (scope === "team") {
    /** Org-wide: all screenshots charged to the shared pool (any member). */
    filter = { orgId: authUser.user.orgId };
  } else {
    /**
     * Personal scope: everything this user generated (personal wallet or team pool).
     * Team-wallet jobs still carry `orgId`; excluding them hid the user’s own runs after refresh.
     */
    filter = { userId: authUser.uid };
  }

  try {
    const db = await getDb();
    const rows = await db
      .collection<GenerationJob>(COLLECTIONS.generationJobs)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(MAX_ITEMS)
      .toArray();

    const jobs = rows.map((j) => ({
      jobId: j.jobId ?? (j._id ? String(j._id) : "unknown"),
      prompt: j.prompt,
      appStoreUrl: j.appStoreUrl,
      status: j.status,
      creditsCharged: j.creditsCharged,
      createdAt: j.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      updatedAt: j.updatedAt?.toISOString?.() ?? j.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      devices: (j.devices ?? []).map((d) => ({
        presetId: d.presetId,
        variantIndex: d.variantIndex,
        status: d.status,
        outputUrl: d.outputUrl,
        error: d.error,
      })),
    }));

    return NextResponse.json({ jobs });
  } catch (e) {
    console.error("[api/generations] Error:", e);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
