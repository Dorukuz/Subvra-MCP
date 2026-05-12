import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getAccountCreditBreakdown } from "@/lib/credits";
import { getOrganization } from "@/lib/team-helpers";
import { workspaceFromUser } from "@/lib/workspace";

export async function GET() {
  const auth = await verifyAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const breakdown = await getAccountCreditBreakdown(auth.uid);
  const u = auth.user;

  const org = u.orgId ? await getOrganization(u.orgId) : null;

  return NextResponse.json({
    user: {
      uid: auth.uid,
      email: u.email,
      displayName: u.displayName,
      credits: breakdown.effective,
      personalCredits: breakdown.personal,
      teamCredits: breakdown.team,
      orgId: u.orgId ?? null,
      orgName: org?.name ?? null,
      workspace: workspaceFromUser(u),
      role: u.role,
      trial: u.trial ?? null,
      subscription: u.subscription ?? null,
      autoTopUp: u.autoTopUp,
      hasStripeCustomer: Boolean(u.stripeCustomerId),
    },
  });
}
