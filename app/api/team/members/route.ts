import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedFromAuthError } from "@/lib/auth";
import { COLLECTIONS } from "@/lib/db/models";
import { getDb } from "@/lib/mongodb";
import { findUserByEmail, getMembership } from "@/lib/team-helpers";

export async function POST(req: NextRequest) {
  let authUser;
  try {
    authUser = await requireAuth();
  } catch (e) {
    return (
      unauthorizedFromAuthError(e) ??
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  const orgId = authUser.user.orgId;
  if (!orgId) {
    return NextResponse.json({ error: "Create a team first" }, { status: 400 });
  }

  const m = await getMembership(orgId, authUser.uid);
  if (!m || m.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can invite members" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const target = await findUserByEmail(email);
    if (!target) {
      return NextResponse.json(
        { error: "No account with that email. They must sign up first." },
        { status: 404 }
      );
    }

    if (target.firebaseUid === authUser.uid) {
      return NextResponse.json({ error: "You are already in this team" }, { status: 400 });
    }

    if (target.orgId && target.orgId !== orgId) {
      return NextResponse.json(
        { error: "That user already belongs to another organization" },
        { status: 400 }
      );
    }

    if (target.orgId === orgId) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();

    await db.collection(COLLECTIONS.memberships).insertOne({
      orgId,
      userId: target.firebaseUid,
      role: "member",
      joinedAt: now,
    });

    await db.collection(COLLECTIONS.users).updateOne(
      { firebaseUid: target.firebaseUid },
      { $set: { orgId, updatedAt: now } }
    );

    return NextResponse.json({ ok: true, userId: target.firebaseUid });
  } catch (e) {
    console.error("[api/team/members POST]", e);
    return NextResponse.json({ error: "Could not add member" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let authUser;
  try {
    authUser = await requireAuth();
  } catch (e) {
    return (
      unauthorizedFromAuthError(e) ??
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  const orgId = authUser.user.orgId;
  if (!orgId) {
    return NextResponse.json({ error: "No team" }, { status: 400 });
  }

  const m = await getMembership(orgId, authUser.uid);
  if (!m || m.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can remove members" }, { status: 403 });
  }

  const targetUserId = req.nextUrl.searchParams.get("userId")?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "userId query required" }, { status: 400 });
  }

  const targetMembership = await getMembership(orgId, targetUserId);
  if (!targetMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 404 });
  }
  if (targetMembership.role === "owner") {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
  }
  if (targetUserId === authUser.uid) {
    return NextResponse.json({ error: "Use Leave team to remove yourself" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const now = new Date();

    await db.collection(COLLECTIONS.memberships).deleteOne({
      orgId,
      userId: targetUserId,
    });
    await db.collection(COLLECTIONS.users).updateOne(
      { firebaseUid: targetUserId },
      { $unset: { orgId: "" }, $set: { updatedAt: now } }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/team/members DELETE]", e);
    return NextResponse.json({ error: "Could not remove member" }, { status: 500 });
  }
}
