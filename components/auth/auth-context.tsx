"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

type TrialInfo = {
  startedAt: string;
  endsAt: string;
  creditsGranted: number;
};

type SubscriptionInfo = {
  stripeSubscriptionId: string;
  plan: "starter" | "pro" | "team";
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodEnd: string;
};

export interface AccountSnapshot {
  credits: number;
  orgId: string | null;
  orgName: string | null;
  workspace: "personal" | "team" | null;
  personalCredits: number;
  teamCredits: number | null;
  role: "user" | "admin";
  trial: TrialInfo | null;
  subscription: SubscriptionInfo | null;
  autoTopUp: boolean;
  hasStripeCustomer: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  account: AccountSnapshot | null;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  account: null,
  signOut: async () => {},
  getIdToken: async () => null,
  refreshAccount: async () => {},
});

type SessionUserPayload = {
  credits?: number;
  personalCredits?: number;
  teamCredits?: number | null;
  orgId?: string | null;
  orgName?: string | null;
  workspace?: "personal" | "team" | null;
  role?: "user" | "admin";
  trial?: TrialInfo | null;
  subscription?: SubscriptionInfo | null;
  autoTopUp?: boolean;
  hasStripeCustomer?: boolean;
};

function mapSessionUser(data: { user?: SessionUserPayload } | null): AccountSnapshot | null {
  const u = data?.user;
  if (!u || typeof u.credits !== "number" || !u.role) return null;
  const personal =
    typeof u.personalCredits === "number" ? u.personalCredits : u.credits;
  const team =
    u.teamCredits === undefined
      ? null
      : u.teamCredits === null || typeof u.teamCredits === "number"
        ? u.teamCredits
        : null;
  const workspace =
    u.workspace === "personal" || u.workspace === "team" ? u.workspace : null;
  return {
    credits: u.credits,
    orgId: u.orgId ?? null,
    orgName: typeof u.orgName === "string" ? u.orgName : null,
    workspace,
    personalCredits: personal,
    teamCredits: team,
    role: u.role,
    trial: u.trial ?? null,
    subscription: u.subscription ?? null,
    autoTopUp: Boolean(u.autoTopUp),
    hasStripeCustomer: Boolean(u.hasStripeCustomer),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccount = useCallback(async () => {
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase-client");
      const auth = getFirebaseAuth();
      const u = auth.currentUser;
      if (!u) return;
      const token = await u.getIdToken();
      const res = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return;
      const snap = mapSessionUser(data);
      if (snap) setAccount(snap);
    } catch {
      /* keep prior account */
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initAuth() {
      try {
        const { getFirebaseAuth } = await import("@/lib/firebase-client");
        const { onAuthStateChanged } = await import("firebase/auth");
        const auth = getFirebaseAuth();

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
            try {
              const token = await firebaseUser.getIdToken();
              const res = await fetch("/api/auth/session", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (!res.ok) {
                setAccount(null);
              } else {
                const snap = mapSessionUser(data);
                if (snap) setAccount(snap);
                else setAccount(null);
              }
            } catch {
              setAccount(null);
            }
          } else {
            setUser(null);
            setAccount(null);
          }
          setLoading(false);
        });
      } catch {
        setLoading(false);
      }
    }

    initAuth();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const getIdTokenForApi = useCallback(async (): Promise<string | null> => {
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase-client");
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      return await currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const signOut = async () => {
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase-client");
      const { signOut: firebaseSignOut } = await import("firebase/auth");
      await firebaseSignOut(getFirebaseAuth());
      setUser(null);
      setAccount(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        account,
        signOut,
        getIdToken: getIdTokenForApi,
        refreshAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
