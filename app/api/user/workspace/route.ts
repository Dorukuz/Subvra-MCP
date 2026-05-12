import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedFromAuthError } from "@/lib/auth";
import { COLLECTIONS, type User } from "@/lib/db/models";
import { getDb } from "@/lib/mongodb";
import { getMembership } from "@/lib/team-helpers";
import { workspaceFromUser } from "@/lib/workspace";

export async function PATCH(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth();
  } catch (e) {
    return (
      unauthorizedFromAuthError(e) ??
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  const orgId = auth.user.orgId;
  if (!orgId) {
    return NextResponse.json({ error: "You are not in a team workspace" }, { status: 400 });
  }

  const membership = await getMembership(orgId, auth.uid);
  if (!membership) {
    return NextResponse.json({ error: "Not a team member" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const w =
    body && typeof body === "object" && "workspace" in body
      ? (body as { workspace?: unknown }).workspace
      : undefined;
  if (w !== "personal" && w !== "team") {
    return NextResponse.json(
      { error: 'Body must include workspace: "personal" | "team"' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const now = new Date();
    await db
      .collection<User>(COLLECTIONS.users)
      .updateOne(
        { firebaseUid: auth.uid },
        { $set: { workspace: w, updatedAt: now } }
      );
  } catch (e) {
    console.error("[api/user/workspace] Error:", e);
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  }

  const updatedUser: User = { ...auth.user, workspace: w };
  return NextResponse.json({ ok: true, workspace: workspaceFromUser(updatedUser) });
}
