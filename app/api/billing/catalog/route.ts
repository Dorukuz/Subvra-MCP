import { NextResponse } from "next/server";
import { STRIPE_PLANS, STRIPE_TOPUPS } from "@/lib/stripe";

export async function GET() {
  const plans = (Object.keys(STRIPE_PLANS) as (keyof typeof STRIPE_PLANS)[]).map(
    (key) => ({
      key,
      name: STRIPE_PLANS[key].name,
      credits: STRIPE_PLANS[key].credits,
      priceId: STRIPE_PLANS[key].priceId,
    })
  ).filter((p) => p.priceId);

  const topups = (Object.keys(STRIPE_TOPUPS) as (keyof typeof STRIPE_TOPUPS)[]).map(
    (key) => ({
      key,
      credits: STRIPE_TOPUPS[key].credits,
      priceId: STRIPE_TOPUPS[key].priceId,
    })
  ).filter((p) => p.priceId);

  return NextResponse.json({
    configured: plans.length > 0 || topups.length > 0,
    plans,
    topups,
  });
}
