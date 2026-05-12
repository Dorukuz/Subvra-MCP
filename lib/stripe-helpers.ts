import { STRIPE_PLANS, STRIPE_TOPUPS } from "./stripe";

export function creditsForPriceId(priceId: string): number | null {
  for (const p of Object.values(STRIPE_PLANS)) {
    if (p.priceId && p.priceId === priceId) return p.credits;
  }
  for (const p of Object.values(STRIPE_TOPUPS)) {
    if (p.priceId && p.priceId === priceId) return p.credits;
  }
  return null;
}

export function planKeyForSubscriptionPriceId(
  priceId: string
): keyof typeof STRIPE_PLANS | null {
  for (const key of Object.keys(STRIPE_PLANS) as (keyof typeof STRIPE_PLANS)[]) {
    const p = STRIPE_PLANS[key];
    if (p.priceId && p.priceId === priceId) return key;
  }
  return null;
}
