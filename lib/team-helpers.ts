import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { COLLECTIONS, type Membership, type Organization, type User } from "./db/models";

export async function getMembership(
  orgId: string,
  firebaseUid: string
): Promise<Membership | null> {
  const db = await getDb();
  return db
    .collection<Membership>(COLLECTIONS.memberships)
    .findOne({ orgId, userId: firebaseUid });
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const db = await getDb();
  try {
    return db
      .collection<Organization>(COLLECTIONS.organizations)
      .findOne({ _id: new ObjectId(orgId) });
  } catch {
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  return db
    .collection<User>(COLLECTIONS.users)
    .findOne({ email: email.trim().toLowerCase() });
}
