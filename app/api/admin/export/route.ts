import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { COLLECTIONS, type GenerationJob, type User } from "@/lib/db/models";
import type { CreditTransaction } from "@/lib/credits";

const ALLOWED_EXPORT_TYPES = ["users", "transactions", "generations"] as const;
type ExportType = (typeof ALLOWED_EXPORT_TYPES)[number];

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawType = req.nextUrl.searchParams.get("type") || "users";
  const type: ExportType = ALLOWED_EXPORT_TYPES.includes(rawType as ExportType)
    ? (rawType as ExportType)
    : "users";

  const client = await clientPromise;
  const db = client.db();

  let csvBody = "";

  if (type === "users") {
    const users = await db
      .collection<User>(COLLECTIONS.users)
      .find({})
      .sort({ createdAt: -1 })
      .limit(20_000)
      .toArray();
    const wallets = await db
      .collection(COLLECTIONS.wallets)
      .find({
        userId: { $in: users.map((u) => u.firebaseUid) },
      })
      .toArray();
    const creditsByUser = new Map(wallets.map((w) => [w.userId, w.credits as number]));

    csvBody =
      "email,displayName,firebaseUid,role,credits,createdAt\n" +
      users
        .map(
          (u) =>
            [
              escapeCsvField(u.email),
              escapeCsvField(u.displayName ?? ""),
              escapeCsvField(u.firebaseUid),
              u.role,
              String(creditsByUser.get(u.firebaseUid) ?? 0),
              escapeCsvField(u.createdAt?.toISOString() ?? ""),
            ].join(",")
        )
        .join("\n");
  }

  if (type === "transactions") {
    const rows = await db
      .collection<CreditTransaction>(COLLECTIONS.creditTransactions)
      .find({})
      .sort({ createdAt: -1 })
      .limit(50_000)
      .toArray();
    csvBody =
      "userId,type,amount,balance_after,reason,createdAt\n" +
      rows
        .map((r) =>
          [
            escapeCsvField(r.userId),
            r.type,
            String(r.amount),
            String(r.balance_after),
            escapeCsvField(r.reason),
            escapeCsvField(r.createdAt?.toISOString() ?? ""),
          ].join(",")
        )
        .join("\n");
  }

  if (type === "generations") {
    const rows = await db
      .collection<GenerationJob>(COLLECTIONS.generationJobs)
      .find({})
      .sort({ createdAt: -1 })
      .limit(20_000)
      .toArray();
    csvBody =
      "userId,prompt,devices,status,creditsCharged,createdAt\n" +
      rows
        .map((r) =>
          [
            escapeCsvField(r.userId),
            escapeCsvField((r.prompt ?? "").slice(0, 500)),
            escapeCsvField((r.devices ?? []).map((d) => d.presetId).join(";")),
            r.status,
            String(r.creditsCharged ?? 0),
            escapeCsvField(r.createdAt?.toISOString() ?? ""),
          ].join(",")
        )
        .join("\n");
  }

  const safeFilename = `${type}_export_${Date.now()}.csv`;

  return new NextResponse(csvBody, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    },
  });
}
