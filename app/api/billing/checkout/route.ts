import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedFromAuthError } from "@/lib/auth";
import { getStripe, STRIPE_PLANS, STRIPE_TOPUPS } from "@/lib/stripe";
import { creditsForPriceId } from "@/lib/stripe-helpers";
import clientPromise from "@/lib/mongodb";
import { COLLECTIONS, type User } from "@/lib/db/models";

const ALLOWED_PRICE_IDS = new Set(
  [
    ...Object.values(STRIPE_PLANS).map((p) => p.priceId),
    ...Object.values(STRIPE_TOPUPS).map((p) => p.priceId),
  ].filter(Boolean)
);

const MIN_CENTS_PER_CREDIT = Number.parseInt(
  process.env.BILLING_MIN_CENTS_PER_CREDIT || "20",
  10
);

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

  try {
    if (ALLOWED_PRICE_IDS.size === 0) {
      return NextResponse.json(
        {
          error:
            "Stripe price IDs are not configured. Set STRIPE_STARTER_PRICE_ID and related env vars.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { priceId, mode } = body as { priceId?: string; mode?: string };
    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json({ error: "Price ID required" }, { status: 400 });
    }
    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }
    const checkoutMode = mode === "subscription" ? "subscription" : "payment";

    const stripe = getStripe();
    const creditsForPrice = creditsForPriceId(priceId);
    if (!creditsForPrice || creditsForPrice <= 0) {
      return NextResponse.json({ error: "Price-credit mapping is invalid" }, { status: 400 });
    }

    const stripePrice = await stripe.prices.retrieve(priceId);
    if (stripePrice.unit_amount == null) {
      return NextResponse.json(
        { error: "Unsupported Stripe price type for checkout" },
        { status: 400 }
      );
    }

    const expectedMode = stripePrice.recurring ? "subscription" : "payment";
    if (checkoutMode !== expectedMode) {
      return NextResponse.json(
        { error: "Checkout mode does not match selected price type" },
        { status: 400 }
      );
    }

    const minAllowedCents = creditsForPrice * MIN_CENTS_PER_CREDIT;
    if (stripePrice.unit_amount < minAllowedCents) {
      return NextResponse.json(
        {
          error:
            "Selected price is below configured profitability floor. Please fix Stripe pricing configuration.",
        },
        { status: 400 }
      );
    }

    const user = authUser.user;
    let customerId = user.stripeCustomerId;
    const client = await clientPromise;
    const db = client.db();

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { firebaseUid: authUser.uid },
      });
      customerId = customer.id;
      await db.collection<User>(COLLECTIONS.users).updateOne(
        { firebaseUid: authUser.uid },
        { $set: { stripeCustomerId: customerId, updatedAt: new Date() } }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let origin: string;
    try {
      origin = new URL(appUrl).origin;
    } catch {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL is invalid; cannot build checkout redirects" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: checkoutMode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?checkout=success`,
      cancel_url: `${origin}/dashboard/billing?checkout=canceled`,
      metadata: { firebaseUid: authUser.uid },
      subscription_data:
        checkoutMode === "subscription"
          ? { metadata: { firebaseUid: authUser.uid } }
          : undefined,
      // Default off to avoid deep discounts that can undercut credit economics.
      allow_promotion_codes: false,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("STRIPE_SECRET_KEY")
    ) {
      return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
    }
    console.error("[billing/checkout] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
