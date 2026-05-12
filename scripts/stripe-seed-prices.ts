/**
 * Creates Subvra Stripe products/prices (test or live) for checkout.
 *
 * Prerequisites: `STRIPE_SECRET_KEY` in `.env` or `.env.local` (`sk_test_...` or `sk_live_...`).
 *
 * Run:
 *   npm run stripe:seed
 *
 * Copy the printed lines into `.env.local`. Then configure webhooks (see script output).
 *
 * Live keys create real Products/Prices that affect your live account—double-check amounts first.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadEnvFiles();

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY (sk_test_... or sk_live_...) in .env or .env.local first.");
  process.exit(1);
}

if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
  console.error("STRIPE_SECRET_KEY must start with sk_test_ or sk_live_.");
  process.exit(1);
}

if (key.startsWith("sk_live_")) {
  console.warn("\n⚠️  LIVE MODE: You are using a live secret key.");
  console.warn("   This will create real Products and Prices in production Stripe.\n");
}

const stripe = new Stripe(key, { typescript: true });

const cents = (n: string | undefined, fallback: number) => {
  const v = n ? Number.parseInt(n, 10) : NaN;
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

async function main() {
  const starterCents = cents(process.env.STRIPE_SEED_STARTER_CENTS, 999);
  const proCents = cents(process.env.STRIPE_SEED_PRO_CENTS, 2499);
  const teamCents = cents(process.env.STRIPE_SEED_TEAM_CENTS, 5999);
  const top25Cents = cents(process.env.STRIPE_SEED_TOPUP_25_CENTS, 499);
  const top75Cents = cents(process.env.STRIPE_SEED_TOPUP_75_CENTS, 1499);
  const top200Cents = cents(process.env.STRIPE_SEED_TOPUP_200_CENTS, 3999);

  const subProduct = await stripe.products.create({
    name: "Subvra — subscription",
    description: "Monthly screenshot credits (Subvra)",
    metadata: { app: "subvra", kind: "subscription" },
  });

  const subStarter = await stripe.prices.create({
    product: subProduct.id,
    currency: "usd",
    unit_amount: starterCents,
    recurring: { interval: "month" },
    metadata: { app: "subvra", plan: "starter", credits: "25" },
  });
  const subPro = await stripe.prices.create({
    product: subProduct.id,
    currency: "usd",
    unit_amount: proCents,
    recurring: { interval: "month" },
    metadata: { app: "subvra", plan: "pro", credits: "80" },
  });
  const subTeam = await stripe.prices.create({
    product: subProduct.id,
    currency: "usd",
    unit_amount: teamCents,
    recurring: { interval: "month" },
    metadata: { app: "subvra", plan: "team", credits: "200" },
  });

  const topProduct = await stripe.products.create({
    name: "Subvra — credit top-up",
    description: "One-time credit packs (Subvra)",
    metadata: { app: "subvra", kind: "topup" },
  });

  const top25 = await stripe.prices.create({
    product: topProduct.id,
    currency: "usd",
    unit_amount: top25Cents,
    metadata: { app: "subvra", credits: "25" },
  });
  const top75 = await stripe.prices.create({
    product: topProduct.id,
    currency: "usd",
    unit_amount: top75Cents,
    metadata: { app: "subvra", credits: "75" },
  });
  const top200 = await stripe.prices.create({
    product: topProduct.id,
    currency: "usd",
    unit_amount: top200Cents,
    metadata: { app: "subvra", credits: "200" },
  });

  console.log("\n--- Add these to .env.local (or .env) ---\n");
  console.log(`STRIPE_SECRET_KEY=${key}`);
  console.log(`STRIPE_STARTER_PRICE_ID=${subStarter.id}`);
  console.log(`STRIPE_PRO_PRICE_ID=${subPro.id}`);
  console.log(`STRIPE_TEAM_PRICE_ID=${subTeam.id}`);
  console.log(`STRIPE_TOPUP_25_PRICE_ID=${top25.id}`);
  console.log(`STRIPE_TOPUP_75_PRICE_ID=${top75.id}`);
  console.log(`STRIPE_TOPUP_200_PRICE_ID=${top200.id}`);
  console.log("\n(Webhook signing secret after `stripe listen` — see below)");
  console.log("# STRIPE_WEBHOOK_SECRET=whsec_...\n");
  console.log("--- Optional amounts (cents USD) next run ---");
  console.log(
    "# STRIPE_SEED_STARTER_CENTS=999 STRIPE_SEED_PRO_CENTS=2499 STRIPE_SEED_TEAM_CENTS=5999 \\"
  );
  console.log(
    "# STRIPE_SEED_TOPUP_25_CENTS=499 STRIPE_SEED_TOPUP_75_CENTS=1499 STRIPE_SEED_TOPUP_200_CENTS=3999 npm run stripe:seed"
  );
  console.log("\n--- Local webhooks ---");
  console.log("Install Stripe CLI: https://stripe.com/docs/stripe-cli");
  console.log(
    "Then run:  npm run stripe:listen\nPaste the whsec_... value as STRIPE_WEBHOOK_SECRET.\n"
  );
  console.log("--- Dashboard ---");
  console.log("Stripe Dashboard → Developers → Webhooks (production):");
  console.log(
    "  URL: https://YOUR_DOMAIN/api/webhooks/stripe\n  Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid\n"
  );
  console.log("Settings → Customer portal: activate features you want (cancel, payment methods).\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
