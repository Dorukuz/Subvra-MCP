import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db/models";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const usersTotal = await db.collection(COLLECTIONS.users).countDocuments();
  const activeToday = await db.collection(COLLECTIONS.users).countDocuments({
    lastLoginAt: { $gte: startOfToday },
  });

  const debitTodayAgg = await db
    .collection(COLLECTIONS.creditTransactions)
    .aggregate([
      { $match: { type: "debit", createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, n: { $sum: 1 } } },
    ])
    .toArray();
  const generationsToday = debitTodayAgg[0]?.n ?? 0;

  const debitMonthAgg = await db
    .collection(COLLECTIONS.creditTransactions)
    .aggregate([
      { $match: { type: "debit", createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, n: { $sum: 1 } } },
    ])
    .toArray();
  const generationsMonth = debitMonthAgg[0]?.n ?? 0;

  const allTimeDebits = await db
    .collection(COLLECTIONS.creditTransactions)
    .countDocuments({ type: "debit" });

  const consumedAgg = await db
    .collection(COLLECTIONS.creditTransactions)
    .aggregate([
      { $match: { type: "debit", createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } },
    ])
    .toArray();
  const consumed30d = consumedAgg[0]?.total ?? 0;

  const grantedAgg = await db
    .collection(COLLECTIONS.creditTransactions)
    .aggregate([
      {
        $match: {
          type: { $in: ["trial_grant", "subscription_grant", "topup", "admin_adjustment"] },
          amount: { $gt: 0 },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])
    .toArray();
  const granted30d = grantedAgg[0]?.total ?? 0;

  const activeSubs = await db.collection(COLLECTIONS.users).countDocuments({
    "subscription.status": { $in: ["active", "trialing"] },
  });

  const churned30d = await db.collection(COLLECTIONS.users).countDocuments({
    "subscription.status": "canceled",
    updatedAt: { $gte: thirtyDaysAgo },
  });

  return NextResponse.json({
    users: { total: usersTotal, activeToday },
    generations: {
      today: generationsToday,
      thisMonth: generationsMonth,
      allTime: allTimeDebits,
    },
    credits: { consumed30d, granted30d },
    subscriptions: { active: activeSubs, churned30d },
    revenue: { mrr: 0, arr: 0 },
  });
}
