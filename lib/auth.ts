import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "./firebase-admin";
import { getDb } from "./mongodb";
import { COLLECTIONS, type User } from "./db/models";
import { verifyMcpToken } from "./mcp-token";

export interface AuthUser {
  uid: string;
  email: string;
  user: User;
}

export type AuthFailureReason =
  | "missing_token"
  | "invalid_token"
  | "user_not_found"
  | "database_unavailable";

export class AuthError extends Error {
  readonly reason: AuthFailureReason;

  constructor(reason: AuthFailureReason) {
    super("Unauthorized");
    this.name = "AuthError";
    this.reason = reason;
  }
}

const AUTH_FAILURE_HINTS: Record<AuthFailureReason, string> = {
  missing_token:
    "Send Authorization: Bearer <token> or header x-subvra-mcp-token. For MCP, run mcp_auth(action=set) first.",
  invalid_token:
    "Token invalid or expired. Firebase ID tokens expire after about an hour—sign in again or use a dashboard MCP token from /dashboard/mcp (recommended for agents).",
  user_not_found:
    "No Subvra user record for this account. Open the app once while signed in so we can create your profile (or POST /api/auth/session with your Firebase ID token).",
  database_unavailable:
    "Could not reach the database. Ensure MongoDB is running and MONGODB_URI is set correctly.",
};

export function unauthorizedFromAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        reason: error.reason,
        hint: AUTH_FAILURE_HINTS[error.reason],
      },
      { status: 401 }
    );
  }
  return null;
}

export async function verifyAuthDetailed(): Promise<
  { ok: true; auth: AuthUser } | { ok: false; reason: AuthFailureReason }
> {
  try {
    const headerList = await headers();
    const authHeader = headerList.get("authorization");
    const mcpHeader = headerList.get("x-subvra-mcp-token");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;
    const token = mcpHeader?.trim() || bearerToken;
    if (!token) {
      return { ok: false, reason: "missing_token" };
    }

    let db;
    try {
      db = await getDb();
    } catch {
      return { ok: false, reason: "database_unavailable" };
    }

    const mcp = verifyMcpToken(token);
    if (mcp) {
      const user = await db.collection<User>(COLLECTIONS.users).findOne({ firebaseUid: mcp.uid });
      if (!user) {
        return { ok: false, reason: "user_not_found" };
      }
      return {
        ok: true,
        auth: {
          uid: mcp.uid,
          email: user.email,
          user,
        },
      };
    }

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      const user = await db.collection<User>(COLLECTIONS.users).findOne({ firebaseUid: decoded.uid });
      if (!user) {
        return { ok: false, reason: "user_not_found" };
      }
      return {
        ok: true,
        auth: {
          uid: decoded.uid,
          email: decoded.email || user.email,
          user,
        },
      };
    } catch {
      return { ok: false, reason: "invalid_token" };
    }
  } catch {
    return { ok: false, reason: "database_unavailable" };
  }
}

export async function verifyAuth(): Promise<AuthUser | null> {
  const r = await verifyAuthDetailed();
  return r.ok ? r.auth : null;
}

export async function requireAuth(): Promise<AuthUser> {
  const r = await verifyAuthDetailed();
  if (!r.ok) {
    throw new AuthError(r.reason);
  }
  return r.auth;
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
