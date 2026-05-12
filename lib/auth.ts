import { headers } from "next/headers";
import { adminAuth } from "./firebase-admin";
import { getDb } from "./mongodb";
import { COLLECTIONS, type User } from "./db/models";

export interface AuthUser {
  uid: string;
  email: string;
  user: User;
}

export async function verifyAuth(): Promise<AuthUser | null> {
  try {
    const headerList = await headers();
    const authHeader = headerList.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    
    const db = await getDb();
    const user = await db
      .collection<User>(COLLECTIONS.users)
      .findOne({ firebaseUid: decoded.uid });

    if (!user) return null;

    return {
      uid: decoded.uid,
      email: decoded.email || user.email,
      user,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const auth = await verifyAuth();
  if (!auth) {
    throw new Error("Unauthorized");
  }
  return auth;
}

export async function requireAdmin(): Promise<AuthUser> {
  const auth = await requireAuth();
  if (auth.user.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }
  return auth;
}

export async function upsertUser(
  firebaseUid: string,
  email: string,
  displayName?: string,
  photoURL?: string
): Promise<User> {
  const db = await getDb();
  const now = new Date();

  const result = await db.collection<User>(COLLECTIONS.users).findOneAndUpdate(
    { firebaseUid },
    {
      $set: {
        email,
        displayName,
        photoURL,
        lastLoginAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        role: "user" as const,
        autoTopUp: true,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return result!;
}
