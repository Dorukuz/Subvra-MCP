import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth, unauthorizedFromAuthError } from "@/lib/auth";
import { COLLECTIONS, type Organization } from "@/lib/db/models";
import { getMembership } from "@/lib/team-helpers";
import { getDb } from "@/lib/mongodb";

const MAX_NAME = 80;

/** Create organization (user must not already belong to one). */
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

  if (authUser.user.orgId) {
    return NextResponse.json(
      { error: "You are already in an organization. Leave it before creating a new one." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const raw = typeof body.name === "string" ? body.name.trim() : "";
    if (!raw) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }
    const name = raw.slice(0, MAX_NAME);

    const db = await getDb();
    const now = new Date();

    const orgInsert = await db.collection<Organization>(COLLECTIONS.organizations).insertOne({
      name,
      ownerId: authUser.uid,
      createdAt: now,
      updatedAt: now,
    });
    const orgId = orgInsert.insertedId.toHexString();

    await db.collection(COLLECTIONS.memberships).insertOne({
      orgId,
      userId: authUser.uid,
      role: "owner",
      joinedAt: now,
    });

    await db.collection(COLLECTIONS.users).updateOne(
      { firebaseUid: authUser.uid },
      { $set: { orgId, updatedAt: now } }
    );

    await db.collection(COLLECTIONS.wallets).insertOne({
      orgId,
      credits: 0,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true, orgId, name });
  } catch (e) {
    console.error("[api/team/organization POST]", e);
    return NextResponse.json({ error: "Could not create organization" }, { status: 500 });
  }
}

/** Delete organization (owner only). Removes all members from org. */
export async function DELETE() {
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
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const m = await getMembership(orgId, authUser.uid);
  if (!m || m.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can delete the organization" }, { status: 403 });
  }

  try {
    const db = await getDb();
    const now = new Date();
    const members = await db
      .collection(COLLECTIONS.memberships)
      .find({ orgId })
      .toArray();

    for (const row of members) {
      await db.collection(COLLECTIONS.users).updateOne(
        { firebaseUid: row.userId },
        { $unset: { orgId: "" }, $set: { updatedAt: now } }
      );
    }

    await db.collection(COLLECTIONS.memberships).deleteMany({ orgId });
    await db.collection(COLLECTIONS.wallets).deleteOne({ orgId });
    await db.collection(COLLECTIONS.organizations).deleteOne({ _id: new ObjectId(orgId) });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/team/organization DELETE]", e);
    return NextResponse.json({ error: "Could not delete organization" }, { status: 500 });
  }
}
