import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  let authUser;
  try {
    authUser = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const customerId = authUser.user.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "No Stripe customer on file. Purchase a plan or top-up first to manage billing.",
        },
        { status: 400 }
      );
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("STRIPE_SECRET_KEY")
    ) {
      return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
    }
    console.error("[billing/portal] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
