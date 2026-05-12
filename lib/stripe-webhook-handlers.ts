import type Stripe from "stripe";
import clientPromise from "./mongodb";
import { COLLECTIONS, type User } from "./db/models";
import { creditWallet } from "./credits";
import { getStripe, STRIPE_PLANS } from "./stripe";
import { creditsForPriceId, planKeyForSubscriptionPriceId } from "./stripe-helpers";

function subStatus(
  s: Stripe.Subscription.Status
): "active" | "past_due" | "canceled" | "trialing" {
  if (s === "trialing") return "trialing";
  if (s === "past_due") return "past_due";
  if (s === "canceled" || s === "unpaid" || s === "incomplete_expired") return "canceled";
  return "active";
}

function subscriptionPeriodEndDate(sub: Stripe.Subscription): Date {
  const sec = sub.items?.data[0]?.current_period_end ?? sub.start_date;
  return new Date(sec * 1000);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice.parent?.subscription_details?.subscription;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.id;
}

/** Skip processing if this event was already stored (success path). */
export async function wasStripeEventRecorded(eventId: string): Promise<boolean> {
  const client = await clientPromise;
  const doc = await client
    .db()
    .collection(COLLECTIONS.stripeEvents)
    .findOne({ stripeEventId: eventId });
  return doc != null;
}

export async function recordStripeEvent(eventId: string, type: string): Promise<void> {
  const client = await clientPromise;
  await client.db().collection(COLLECTIONS.stripeEvents).insertOne({
    stripeEventId: eventId,
    type,
    processed: true,
    processedAt: new Date(),
    createdAt: new Date(),
  });
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const firebaseUid = session.metadata?.firebaseUid;
  if (!firebaseUid) {
    console.warn("[stripe] checkout.session.completed missing metadata.firebaseUid");
    return;
  }

  const stripe = getStripe();
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items"],
  });

  const customerId =
    typeof full.customer === "string"
      ? full.customer
      : full.customer?.id;
  const client = await clientPromise;
  const db = client.db();

  if (customerId) {
    await db.collection<User>(COLLECTIONS.users).updateOne(
      { firebaseUid },
      { $set: { stripeCustomerId: customerId, updatedAt: new Date() } }
    );
  }

  if (full.mode === "payment") {
    const priceId = full.line_items?.data[0]?.price?.id;
    if (!priceId) {
      console.warn("[stripe] one-time checkout: no price id");
      return;
    }
    const credits = creditsForPriceId(priceId);
    if (credits == null || credits <= 0) {
      console.warn("[stripe] one-time checkout: unknown price", priceId);
      return;
    }
    const paymentIntentId =
      typeof full.payment_intent === "string"
        ? full.payment_intent
        : full.payment_intent?.id;
    await creditWallet(firebaseUid, credits, "topup", "Stripe top-up purchase", {
      stripePaymentId: paymentIntentId || full.id,
    });
    return;
  }

  if (full.mode === "subscription") {
    const subId =
      typeof full.subscription === "string"
        ? full.subscription
        : full.subscription?.id;
    if (!subId) {
      console.warn("[stripe] subscription checkout: no subscription id");
      return;
    }
    const sub = await stripe.subscriptions.retrieve(subId);
    const priceId = sub.items.data[0]?.price?.id;
    const planKey = priceId ? planKeyForSubscriptionPriceId(priceId) : null;
    if (!planKey) {
      console.warn("[stripe] subscription: unknown plan price", priceId);
      return;
    }
    await db.collection<User>(COLLECTIONS.users).updateOne(
      { firebaseUid },
      {
        $set: {
          subscription: {
            stripeSubscriptionId: sub.id,
            plan: planKey,
            status: subStatus(sub.status),
            currentPeriodEnd: subscriptionPeriodEndDate(sub),
          },
          updatedAt: new Date(),
        },
      }
    );
  }
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.customer || typeof invoice.customer !== "string") return;
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const client = await clientPromise;
  const db = client.db();

  const existing = await db
    .collection(COLLECTIONS.creditTransactions)
    .findOne({ stripePaymentId: invoice.id });
  if (existing) return;

  const user = await db
    .collection<User>(COLLECTIONS.users)
    .findOne({ stripeCustomerId: invoice.customer });
  if (!user) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = sub.items.data[0]?.price?.id;
  const planKey = priceId ? planKeyForSubscriptionPriceId(priceId) : null;
  if (!planKey) return;
  const plan = STRIPE_PLANS[planKey];
  const periodEnd = invoice.period_end
    ? new Date(invoice.period_end * 1000)
    : subscriptionPeriodEndDate(sub);

  await creditWallet(
    user.firebaseUid,
    plan.credits,
    "subscription_grant",
    `Stripe subscription credits (${plan.name})`,
    {
      stripePaymentId: invoice.id,
      validFrom: new Date(),
      validUntil: periodEnd,
    }
  );

  await db.collection<User>(COLLECTIONS.users).updateOne(
    { firebaseUid: user.firebaseUid },
    {
      $set: {
        subscription: {
          stripeSubscriptionId: sub.id,
          plan: planKey,
          status: subStatus(sub.status),
          currentPeriodEnd: subscriptionPeriodEndDate(sub),
        },
        updatedAt: new Date(),
      },
    }
  );
}

export async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const client = await clientPromise;
  const db = client.db();
  const user = await db
    .collection<User>(COLLECTIONS.users)
    .findOne({ stripeCustomerId: customerId });
  if (!user) return;

  const priceId = sub.items.data[0]?.price?.id;
  const planKey = priceId ? planKeyForSubscriptionPriceId(priceId) : null;
  if (!planKey) return;

  await db.collection<User>(COLLECTIONS.users).updateOne(
    { firebaseUid: user.firebaseUid },
    {
      $set: {
        subscription: {
          stripeSubscriptionId: sub.id,
          plan: planKey,
          status: subStatus(sub.status),
          currentPeriodEnd: subscriptionPeriodEndDate(sub),
        },
        updatedAt: new Date(),
      },
    }
  );
}

export async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const client = await clientPromise;
  const db = client.db();
  const user = await db
    .collection<User>(COLLECTIONS.users)
    .findOne({ stripeCustomerId: customerId });
  if (!user?.subscription) return;

  await db.collection<User>(COLLECTIONS.users).updateOne(
    { stripeCustomerId: customerId },
    {
      $set: {
        subscription: {
          ...user.subscription,
          status: "canceled",
        },
        updatedAt: new Date(),
      },
    }
  );
}
