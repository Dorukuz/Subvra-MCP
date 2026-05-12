import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedFromAuthError } from "@/lib/auth";
import { transferPersonalCreditsToOrg } from "@/lib/credits";
import { getMembership } from "@/lib/team-helpers";

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
    return NextResponse.json({ error: "Join or create a team first" }, { status: 400 });
  }

  const m = await getMembership(orgId, authUser.uid);
  if (!m || m.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can fund the team pool" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const { personalAfter, orgAfter } = await transferPersonalCreditsToOrg(
      authUser.uid,
      orgId,
      amount
    );

    return NextResponse.json({
      ok: true,
      personalCredits: personalAfter,
      teamCredits: orgAfter,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transfer failed";
    if (msg.includes("Insufficient") || msg === "Insufficient credits") {
      return NextResponse.json({ error: "Not enough personal credits" }, { status: 400 });
    }
    console.error("[api/team/transfer]", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
