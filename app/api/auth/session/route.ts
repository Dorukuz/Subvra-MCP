import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { upsertUser } from "@/lib/auth";
import { grantTrialCredits, getAccountCreditBreakdown } from "@/lib/credits";
import { COLLECTIONS, type User } from "@/lib/db/models";
import { getDb } from "@/lib/mongodb";
import { getOrganization } from "@/lib/team-helpers";
import { workspaceFromUser } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);

    let user = await upsertUser(
      decoded.uid,
      decoded.email || "",
      decoded.name,
      decoded.picture
    );

    const adminUids = new Set(
      (process.env.ADMIN_FIREBASE_UIDS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    if (adminUids.has(decoded.uid) && user.role !== "admin") {
      const db = await getDb();
      await db
        .collection<User>(COLLECTIONS.users)
        .updateOne(
          { firebaseUid: decoded.uid },
          { $set: { role: "admin" as const, updatedAt: new Date() } }
        );
      user = { ...user, role: "admin" };
    }

    // Atomically grant trial credits only if not already granted
    if (!user.trial) {
      const db = await getDb();
      const result = await db.collection("users").updateOne(
        { firebaseUid: decoded.uid, trial: { $exists: false } },
        {
          $set: {
            trial: {
              startedAt: new Date(),
              endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              creditsGranted: 2,
            },
          },
        }
      );
      if (result.modifiedCount > 0) {
        await grantTrialCredits(decoded.uid);
      }
    }

    const breakdown = await getAccountCreditBreakdown(decoded.uid);
    const org = user.orgId ? await getOrganization(user.orgId) : null;

    return NextResponse.json({
      user: {
        uid: decoded.uid,
        email: user.email,
        displayName: user.displayName,
        credits: breakdown.effective,
        personalCredits: breakdown.personal,
        teamCredits: breakdown.team,
        orgId: user.orgId ?? null,
        orgName: org?.name ?? null,
        workspace: workspaceFromUser(user),
        role: user.role,
        trial: user.trial ?? null,
        subscription: user.subscription ?? null,
        autoTopUp: user.autoTopUp,
        hasStripeCustomer: Boolean(user.stripeCustomerId),
      },
    });
  } catch (error) {
    console.error("[auth/session] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const isAuth =
      message.includes("auth") ||
      message.includes("token") ||
      message.includes("Firebase");
    return NextResponse.json(
      { error: "Authentication failed", detail: process.env.NODE_ENV === "development" ? message : undefined },
      { status: isAuth ? 401 : 500 }
    );
  }
}
