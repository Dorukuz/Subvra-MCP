import { ObjectId, type ClientSession } from "mongodb";
import clientPromise, { dbFromClient, getDb } from "./mongodb";
import { COLLECTIONS, type User, type Wallet } from "./db/models";
import { userUsesTeamWallet } from "./workspace";

/** Standalone mongod rejects transactions; replica sets / Atlas support them. */
function isTransactionUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("Transaction numbers are only allowed") ||
    /replica set member or mongos/i.test(msg)
  );
}

export interface CreditTransaction {
  _id?: ObjectId;
  userId: string;
  orgId?: string;
  type:
    | "trial_grant"
    | "subscription_grant"
    | "topup"
    | "debit"
    | "refund"
    | "admin_adjustment";
  amount: number;
  balance_after: number;
  reason: string;
  stripePaymentId?: string;
  jobId?: string;
  validFrom?: Date;
  validUntil?: Date;
  createdAt: Date;
}

/** Personal wallet balance (ignores team pool). */
export async function getWalletBalance(userId: string): Promise<number> {
  const db = await getDb();
  const wallet = await db.collection<Wallet>(COLLECTIONS.wallets).findOne({ userId });
  return wallet?.credits ?? 0;
}

export async function getOrgWalletBalance(orgId: string): Promise<number> {
  const db = await getDb();
  const wallet = await db.collection<Wallet>(COLLECTIONS.wallets).findOne({ orgId });
  return wallet?.credits ?? 0;
}

/** Balance used for UI and generation: org pool in team workspace, else personal. */
export async function getEffectiveWalletBalance(firebaseUid: string): Promise<number> {
  const db = await getDb();
  const user = await db.collection<User>(COLLECTIONS.users).findOne({ firebaseUid });
  if (userUsesTeamWallet(user)) {
    return getOrgWalletBalance(user!.orgId!);
  }
  return getWalletBalance(firebaseUid);
}

/** Personal, optional team pool, and which balance is active for the user. */
export async function getAccountCreditBreakdown(firebaseUid: string): Promise<{
  effective: number;
  personal: number;
  team: number | null;
}> {
  const db = await getDb();
  const user = await db.collection<User>(COLLECTIONS.users).findOne({ firebaseUid });
  const personal = await getWalletBalance(firebaseUid);
  if (!user?.orgId) {
    return { effective: personal, personal, team: null };
  }
  const team = await getOrgWalletBalance(user.orgId);
  const effective = userUsesTeamWallet(user) ? team : personal;
  return { effective, personal, team };
}

async function applyDebitCredits(
  client: Awaited<typeof clientPromise>,
  userId: string,
  amount: number,
  reason: string,
  jobId: string | undefined,
  session: ClientSession | undefined
): Promise<{ balance: number }> {
  const db = dbFromClient(client);
  const sessionOpts = session ? { session } : {};
  const wallet = await db
    .collection<Wallet>(COLLECTIONS.wallets)
    .findOne({ userId }, sessionOpts);
  const currentBalance = wallet?.credits ?? 0;
  if (currentBalance < amount) {
    throw new Error("Insufficient credits");
  }
  const finalBalance = currentBalance - amount;
  await db.collection<Wallet>(COLLECTIONS.wallets).updateOne(
    { userId },
    { $set: { credits: finalBalance, updatedAt: new Date() } },
    { upsert: true, ...sessionOpts }
  );
  await db.collection<CreditTransaction>(COLLECTIONS.creditTransactions).insertOne(
    {
      userId,
      type: "debit",
      amount: -amount,
      balance_after: finalBalance,
      reason,
      jobId,
      createdAt: new Date(),
    },
    sessionOpts
  );
  return { balance: finalBalance };
}

async function applyDebitOrgCredits(
  client: Awaited<typeof clientPromise>,
  orgId: string,
  actorUserId: string,
  amount: number,
  reason: string,
  jobId: string | undefined,
  session: ClientSession | undefined
): Promise<{ balance: number }> {
  const db = dbFromClient(client);
  const sessionOpts = session ? { session } : {};
  const wallet = await db.collection<Wallet>(COLLECTIONS.wallets).findOne({ orgId }, sessionOpts);
  const currentBalance = wallet?.credits ?? 0;
  if (currentBalance < amount) {
    throw new Error("Insufficient credits");
  }
  const finalBalance = currentBalance - amount;
  const res = await db.collection<Wallet>(COLLECTIONS.wallets).updateOne(
    { orgId },
    { $set: { credits: finalBalance, updatedAt: new Date() } },
    { ...sessionOpts }
  );
  if (res.matchedCount === 0) {
    throw new Error("Insufficient credits");
  }
  await db.collection<CreditTransaction>(COLLECTIONS.creditTransactions).insertOne(
    {
      userId: actorUserId,
      orgId,
      type: "debit",
      amount: -amount,
      balance_after: finalBalance,
      reason,
      jobId,
      createdAt: new Date(),
    },
    sessionOpts
  );
  return { balance: finalBalance };
}

export async function debitCredits(
  userId: string,
  amount: number,
  reason: string,
  jobId?: string
): Promise<{ success: boolean; balance: number }> {
  const db = await getDb();
  const user = await db.collection<User>(COLLECTIONS.users).findOne({ firebaseUid: userId });
  const orgId = userUsesTeamWallet(user) ? user?.orgId : undefined;

  const client = await clientPromise;
  const session = client.startSession();
  try {
    try {
      let finalBalance = 0;
      await session.withTransaction(async () => {
        if (orgId) {
          const r = await applyDebitOrgCredits(
            client,
            orgId,
            userId,
            amount,
            reason,
            jobId,
            session
          );
          finalBalance = r.balance;
        } else {
          const r = await applyDebitCredits(client, userId, amount, reason, jobId, session);
          finalBalance = r.balance;
        }
      });
      return { success: true, balance: finalBalance };
    } catch (error) {
      if (error instanceof Error && error.message === "Insufficient credits") {
        const balance = orgId
          ? await getOrgWalletBalance(orgId)
          : await getWalletBalance(userId);
        return { success: false, balance };
      }
      if (isTransactionUnsupportedError(error)) {
        try {
          if (orgId) {
            const r = await applyDebitOrgCredits(
              client,
              orgId,
              userId,
              amount,
              reason,
              jobId,
              undefined
            );
            return { success: true, balance: r.balance };
          }
          const r = await applyDebitCredits(client, userId, amount, reason, jobId, undefined);
          return { success: true, balance: r.balance };
        } catch (e2) {
          if (e2 instanceof Error && e2.message === "Insufficient credits") {
            const balance = orgId
              ? await getOrgWalletBalance(orgId)
              : await getWalletBalance(userId);
            return { success: false, balance };
          }
          throw e2;
        }
      }
      throw error;
    }
  } finally {
    await session.endSession();
  }
}

async function applyCreditWallet(
  client: Awaited<typeof clientPromise>,
  userId: string,
  amount: number,
  type: CreditTransaction["type"],
  reason: string,
  extra: { stripePaymentId?: string; validFrom?: Date; validUntil?: Date; orgId?: string } | undefined,
  session: ClientSession | undefined
): Promise<number> {
  const db = dbFromClient(client);
  const sessionOpts = session ? { session } : {};
  const wallet = await db
    .collection<Wallet>(COLLECTIONS.wallets)
    .findOne({ userId }, sessionOpts);
  const currentBalance = wallet?.credits ?? 0;
  const finalBalance = currentBalance + amount;
  await db.collection<Wallet>(COLLECTIONS.wallets).updateOne(
    { userId },
    { $set: { credits: finalBalance, updatedAt: new Date() } },
    { upsert: true, ...sessionOpts }
  );
  await db.collection<CreditTransaction>(COLLECTIONS.creditTransactions).insertOne(
    {
      userId,
      type,
      amount,
      balance_after: finalBalance,
      reason,
      stripePaymentId: extra?.stripePaymentId,
      validFrom: extra?.validFrom,
      validUntil: extra?.validUntil,
      orgId: extra?.orgId,
      createdAt: new Date(),
    },
    sessionOpts
  );
  return finalBalance;
}

async function applyCreditOrgWallet(
  client: Awaited<typeof clientPromise>,
  orgId: string,
  actorUserId: string,
  amount: number,
  type: CreditTransaction["type"],
  reason: string,
  session: ClientSession | undefined
): Promise<number> {
  const db = dbFromClient(client);
  const sessionOpts = session ? { session } : {};
  const wallet = await db.collection<Wallet>(COLLECTIONS.wallets).findOne({ orgId }, sessionOpts);
  const currentBalance = wallet?.credits ?? 0;
  const finalBalance = currentBalance + amount;
  await db.collection<Wallet>(COLLECTIONS.wallets).updateOne(
    { orgId },
    { $set: { credits: finalBalance, updatedAt: new Date() } },
    { upsert: true, ...sessionOpts }
  );
  await db.collection<CreditTransaction>(COLLECTIONS.creditTransactions).insertOne(
    {
      userId: actorUserId,
      orgId,
      type,
      amount,
      balance_after: finalBalance,
      reason,
      createdAt: new Date(),
    },
    sessionOpts
  );
  return finalBalance;
}

export async function creditWallet(
  userId: string,
  amount: number,
  type: CreditTransaction["type"],
  reason: string,
  extra?: { stripePaymentId?: string; validFrom?: Date; validUntil?: Date; orgId?: string }
): Promise<number> {
  const client = await clientPromise;
  const session = client.startSession();
  try {
    try {
      let finalBalance = 0;
      await session.withTransaction(async () => {
        finalBalance = await applyCreditWallet(
          client,
          userId,
          amount,
          type,
          reason,
          extra,
          session
        );
      });
      return finalBalance;
    } catch (error) {
      if (isTransactionUnsupportedError(error)) {
        return applyCreditWallet(client, userId, amount, type, reason, extra, undefined);
      }
      throw error;
    }
  } finally {
    await session.endSession();
  }
}

/**
 * Refund after generation: credits the pool that was debited (`debitedOrgId` from job time),
 * not the user's current workspace preference.
 */
export async function creditRefundForGeneration(
  userId: string,
  amount: number,
  reason: string,
  debitedOrgId: string | null
): Promise<number> {
  if (debitedOrgId) {
    const client = await clientPromise;
    const session = client.startSession();
    try {
      try {
        let b = 0;
        await session.withTransaction(async () => {
          b = await applyCreditOrgWallet(
            client,
            debitedOrgId,
            userId,
            amount,
            "refund",
            reason,
            session
          );
        });
        return b;
      } catch (error) {
        if (isTransactionUnsupportedError(error)) {
          return applyCreditOrgWallet(
            client,
            debitedOrgId,
            userId,
            amount,
            "refund",
            reason,
            undefined
          );
        }
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }
  return creditWallet(userId, amount, "refund", reason);
}

export async function grantTrialCredits(userId: string): Promise<number> {
  return creditWallet(userId, 2, "trial_grant", "Welcome trial: 2 free credits");
}

export async function getTransactionHistory(
  userId: string,
  limit = 50
): Promise<CreditTransaction[]> {
  const db = await getDb();
  return db
    .collection<CreditTransaction>(COLLECTIONS.creditTransactions)
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Move credits from the user's personal wallet into their org pool. Caller must enforce owner role.
 */
export async function transferPersonalCreditsToOrg(
  userId: string,
  orgId: string,
  amount: number
): Promise<{ personalAfter: number; orgAfter: number }> {
  const n = Math.floor(amount);
  if (n <= 0 || !Number.isFinite(amount)) {
    throw new Error("Invalid amount");
  }
  const client = await clientPromise;
  const session = client.startSession();
  try {
    try {
      let personalAfter = 0;
      let orgAfter = 0;
      await session.withTransaction(async () => {
        const d = await applyDebitCredits(
          client,
          userId,
          n,
          "Transfer to team pool",
          undefined,
          session
        );
        personalAfter = d.balance;
        orgAfter = await applyCreditOrgWallet(
          client,
          orgId,
          userId,
          n,
          "topup",
          "Pooled from personal balance",
          session
        );
      });
      return { personalAfter, orgAfter };
    } catch (error) {
      if (isTransactionUnsupportedError(error)) {
        const d = await applyDebitCredits(
          client,
          userId,
          n,
          "Transfer to team pool",
          undefined,
          undefined
        );
        const orgAfter = await applyCreditOrgWallet(
          client,
          orgId,
          userId,
          n,
          "topup",
          "Pooled from personal balance",
          undefined
        );
        return { personalAfter: d.balance, orgAfter };
      }
      throw error;
    }
  } finally {
    await session.endSession();
  }
}
