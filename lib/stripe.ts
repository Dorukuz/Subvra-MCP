import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripe = new Stripe(stripeSecretKey, {
      typescript: true,
    });
  }
  return stripe;
}

export const STRIPE_PLANS = {
  starter: {
    name: "Starter",
    credits: 25,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "",
  },
  pro: {
    name: "Pro",
    credits: 80,
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
  },
  team: {
    name: "Team",
    credits: 200,
    priceId: process.env.STRIPE_TEAM_PRICE_ID || "",
  },
} as const;

export const STRIPE_TOPUPS = {
  small: { credits: 25, priceId: process.env.STRIPE_TOPUP_25_PRICE_ID || "" },
  medium: { credits: 75, priceId: process.env.STRIPE_TOPUP_75_PRICE_ID || "" },
  large: { credits: 200, priceId: process.env.STRIPE_TOPUP_200_PRICE_ID || "" },
} as const;

export default getStripe;
