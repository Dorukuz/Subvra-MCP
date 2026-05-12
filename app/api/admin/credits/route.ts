import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedFromAuthError } from "@/lib/auth";
import { creditWallet, debitCredits } from "@/lib/credits";
import clientPromise from "@/lib/mongodb";
import { COLLECTIONS, type User } from "@/lib/db/models";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return unauthorizedFromAuthError(e) ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { target, delta, reason } = body as {
      target?: string;
      delta?: number;
      reason?: string;
    };
    if (!target || typeof target !== "string") {
      return NextResponse.json(
        { error: "target required (email or Firebase UID)" },
        { status: 400 }
      );
    }
    if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
      return NextResponse.json({ error: "delta must be a non-zero number" }, { status: 400 });
    }
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "reason required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const email = target.includes("@") ? target.trim().toLowerCase() : null;
    const user =
      (await db.collection<User>(COLLECTIONS.users).findOne({ firebaseUid: target.trim() })) ||
      (email ? await db.collection<User>(COLLECTIONS.users).findOne({ email }) : null);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const uid = user.firebaseUid;
    const trimmedReason = reason.trim();

    if (delta > 0) {
      const balance = await creditWallet(uid, Math.trunc(delta), "admin_adjustment", trimmedReason);
      return NextResponse.json({ success: true, balance });
    }

    const amount = Math.abs(Math.trunc(delta));
    const r = await debitCredits(uid, amount, `Admin adjustment: ${trimmedReason}`);
    if (!r.success) {
      return NextResponse.json(
        { error: "Insufficient credits to debit", balance: r.balance },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, balance: r.balance });
  } catch (error) {
    console.error("[api/admin/credits]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
