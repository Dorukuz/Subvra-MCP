import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId;
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: "user" | "admin";
  stripeCustomerId?: string;
  subscription?: {
    stripeSubscriptionId: string;
    plan: "starter" | "pro" | "team";
    status: "active" | "past_due" | "canceled" | "trialing";
    currentPeriodEnd: Date;
  };
  trial?: {
    startedAt: Date;
    endsAt: Date;
    creditsGranted: number;
  };
  autoTopUp: boolean;
  orgId?: string;
  /**
   * When `orgId` is set: `"team"` uses shared pool (default if unset); `"personal"` uses only your own wallet.
   */
  workspace?: "personal" | "team";
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export interface Organization {
  _id?: ObjectId;
  name: string;
  ownerId: string;
  stripeCustomerId?: string;
  subscription?: {
    stripeSubscriptionId: string;
    plan: "team";
    status: "active" | "past_due" | "canceled";
    seats: number;
    currentPeriodEnd: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  _id?: ObjectId;
  orgId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}

export interface Draft {
  _id?: ObjectId;
  userId?: string;
  sessionId: string;
  prompt: string;
  referenceImageUrl?: string;
  selectedDevices: string[];
  status: "pending" | "claimed" | "processing" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationJob {
  _id?: ObjectId;
  /** Client-facing id (same as API `jobId`). */
  jobId: string;
  userId: string;
  draftId?: string;
  prompt: string;
  /** Optional listing URL the user submitted for style context. */
  appStoreUrl?: string;
  referenceImageUrl?: string;
  devices: {
    presetId: string;
    /** When multiple screenshots for the same device, 1-based index within that device. */
    variantIndex?: number;
    status: "queued" | "processing" | "completed" | "failed";
    outputUrl?: string;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  }[];
  creditsCharged: number;
  /** When set, credits were drawn from this org pool. */
  orgId?: string;
  status: "queued" | "processing" | "completed" | "partial" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

/** Wallet: either personal (`userId`) or org pool (`orgId`), never both. */
export interface Wallet {
  userId?: string;
  orgId?: string;
  credits: number;
  updatedAt: Date;
}

export interface StripeEvent {
  _id?: ObjectId;
  stripeEventId: string;
  type: string;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
}

export const COLLECTIONS = {
  users: "users",
  organizations: "organizations",
  memberships: "memberships",
  wallets: "wallets",
  creditTransactions: "credit_transactions",
  drafts: "drafts",
  generationJobs: "generation_jobs",
  stripeEvents: "stripe_events",
} as const;
