import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { COLLECTIONS, type User } from "@/lib/db/models";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const client = await clientPromise;
  const db = client.db();

  const filter: Record<string, unknown> = q
    ? {
        $or: [
          { email: { $regex: escapeRegex(q), $options: "i" } },
          { firebaseUid: q },
          { displayName: { $regex: escapeRegex(q), $options: "i" } },
        ],
      }
    : {};

  const users = await db
    .collection<User>(COLLECTIONS.users)
    .find(filter)
    .project({
      email: 1,
      displayName: 1,
      firebaseUid: 1,
      role: 1,
      createdAt: 1,
    })
    .sort({ createdAt: -1 })
    .limit(25)
    .toArray();

  const uids = users.map((u) => u.firebaseUid);
  const wallets = await db
    .collection(COLLECTIONS.wallets)
    .find({ userId: { $in: uids } })
    .toArray();
  const wb = new Map(wallets.map((w) => [w.userId, w.credits as number]));

  return NextResponse.json({
    users: users.map((u) => ({
      uid: u.firebaseUid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      credits: wb.get(u.firebaseUid) ?? 0,
      createdAt: u.createdAt,
    })),
  });
}
