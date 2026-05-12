import { NextResponse } from "next/server";
import { requireAuth, unauthorizedFromAuthError } from "@/lib/auth";
import {
  getEffectiveWalletBalance,
  getOrgWalletBalance,
  getWalletBalance,
} from "@/lib/credits";
import { COLLECTIONS, type Membership, type User } from "@/lib/db/models";
import { getDb } from "@/lib/mongodb";
import { getMembership, getOrganization } from "@/lib/team-helpers";

export async function GET() {
  let authUser;
  try {
    authUser = await requireAuth();
  } catch (e) {
    return (
      unauthorizedFromAuthError(e) ??
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  const personalCredits = await getWalletBalance(authUser.uid);
  const effectiveCredits = await getEffectiveWalletBalance(authUser.uid);

  const orgId = authUser.user.orgId;
  if (!orgId) {
    return NextResponse.json({
      organization: null,
      members: [],
      personalCredits,
      effectiveCredits,
      you: null,
    });
  }

  try {
    const db = await getDb();
    const org = await getOrganization(orgId);
    if (!org) {
      await db.collection(COLLECTIONS.users).updateOne(
        { firebaseUid: authUser.uid },
        { $unset: { orgId: "" }, $set: { updatedAt: new Date() } }
      );
      const personalCredits = await getWalletBalance(authUser.uid);
      return NextResponse.json({
        organization: null,
        members: [],
        personalCredits,
        effectiveCredits: personalCredits,
        you: null,
        staleOrg: true,
      });
    }

    const membership = await getMembership(orgId, authUser.uid);
    const teamCredits = await getOrgWalletBalance(orgId);

    const memberRows = await db
      .collection<Membership>(COLLECTIONS.memberships)
      .find({ orgId })
      .toArray();
    const userIds = memberRows.map((m) => m.userId);
    const users = await db
      .collection<User>(COLLECTIONS.users)
      .find({ firebaseUid: { $in: userIds } })
      .toArray();
    const emailByUid = new Map(users.map((u) => [u.firebaseUid, u.email] as const));

    const members = memberRows.map((m) => ({
      userId: m.userId,
      email: emailByUid.get(m.userId) ?? "",
      role: m.role,
      joinedAt: m.joinedAt?.toISOString() ?? "",
    }));

    return NextResponse.json({
      organization: {
        id: orgId,
        name: org.name,
        ownerId: org.ownerId,
        teamCredits,
      },
      members,
      personalCredits,
      effectiveCredits,
      you: membership ? { role: membership.role } : null,
    });
  } catch (e) {
    console.error("[api/team GET]", e);
    return NextResponse.json({ error: "Failed to load team" }, { status: 500 });
  }
}
