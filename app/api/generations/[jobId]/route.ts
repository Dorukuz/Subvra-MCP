import type { Filter } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { COLLECTIONS, type GenerationJob } from "@/lib/db/models";
import { getDb } from "@/lib/mongodb";

const MAX_JOB_ID_LEN = 160;

type RouteParams = { params: Promise<{ jobId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  let authUser;
  try {
    authUser = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId: raw } = await params;
  const jobId = decodeURIComponent(raw).trim();
  if (!jobId || jobId.length > MAX_JOB_ID_LEN) {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const orgId = authUser.user.orgId;
    const accessOr: Filter<GenerationJob>[] = [{ userId: authUser.uid }];
    if (orgId) {
      accessOr.push({ orgId });
    }
    const doc = await db
      .collection<GenerationJob>(COLLECTIONS.generationJobs)
      .findOne({
        jobId,
        $or: accessOr,
      });

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const job = {
      jobId: doc.jobId ?? (doc._id ? String(doc._id) : "unknown"),
      prompt: doc.prompt,
      appStoreUrl: doc.appStoreUrl,
      status: doc.status,
      creditsCharged: doc.creditsCharged,
      createdAt: doc.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      updatedAt: doc.updatedAt?.toISOString?.() ?? doc.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
      devices: (doc.devices ?? []).map((d) => ({
        presetId: d.presetId,
        variantIndex: d.variantIndex,
        status: d.status,
        outputUrl: d.outputUrl,
        error: d.error,
      })),
    };

    return NextResponse.json({ job });
  } catch (e) {
    console.error("[api/generations/jobId] Error:", e);
    return NextResponse.json({ error: "Failed to load generation" }, { status: 500 });
  }
}
