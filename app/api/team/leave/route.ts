import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { COLLECTIONS } from "@/lib/db/models";
import { getDb } from "@/lib/mongodb";
import { getMembership } from "@/lib/team-helpers";

export async function POST() {
  let authUser;
  try {
    authUser = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = authUser.user.orgId;
  if (!orgId) {
    return NextResponse.json({ error: "You are not in a team" }, { status: 400 });
  }

  const m = await getMembership(orgId, authUser.uid);
  if (!m) {
    return NextResponse.json({ error: "Membership not found" }, { status: 400 });
  }
  if (m.role === "owner") {
    return NextResponse.json(
      {
        error: "Owners cannot leave. Transfer ownership (coming soon) or delete the organization from Team settings.",
      },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const now = new Date();

    await db.collection(COLLECTIONS.memberships).deleteOne({
      orgId,
      userId: authUser.uid,
    });
    await db.collection(COLLECTIONS.users).updateOne(
      { firebaseUid: authUser.uid },
      { $unset: { orgId: "" }, $set: { updatedAt: now } }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/team/leave]", e);
    return NextResponse.json({ error: "Could not leave team" }, { status: 500 });
  }
}
