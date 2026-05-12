import { getDb } from "../mongodb";
import { COLLECTIONS } from "./models";

export async function ensureIndexes(): Promise<void> {
  const db = await getDb();

  await db.collection(COLLECTIONS.users).createIndexes([
    { key: { firebaseUid: 1 }, unique: true },
    { key: { email: 1 }, unique: true },
    { key: { stripeCustomerId: 1 }, sparse: true },
  ]);

  await db.collection(COLLECTIONS.organizations).createIndexes([
    { key: { ownerId: 1 } },
    { key: { stripeCustomerId: 1 }, sparse: true },
  ]);

  await db.collection(COLLECTIONS.memberships).createIndexes([
    { key: { orgId: 1, userId: 1 }, unique: true },
    { key: { userId: 1 } },
  ]);

  await db.collection(COLLECTIONS.wallets).createIndexes([
    { key: { userId: 1 }, unique: true, sparse: true },
    { key: { orgId: 1 }, unique: true, sparse: true },
  ]);

  await db.collection(COLLECTIONS.creditTransactions).createIndexes([
    { key: { userId: 1, createdAt: -1 } },
    { key: { orgId: 1, createdAt: -1 }, sparse: true },
  ]);

  await db.collection(COLLECTIONS.drafts).createIndexes([
    { key: { sessionId: 1 } },
    { key: { userId: 1 }, sparse: true },
    { key: { status: 1 } },
  ]);

  await db.collection(COLLECTIONS.generationJobs).createIndexes([
    { key: { userId: 1, createdAt: -1 } },
    { key: { status: 1 } },
    { key: { jobId: 1 }, unique: true, sparse: true },
  ]);

  await db.collection(COLLECTIONS.stripeEvents).createIndexes([
    { key: { stripeEventId: 1 }, unique: true },
  ]);
}
