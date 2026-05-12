"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase-client");
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase-client");
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const token = await result.user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-3xl border border-hairline bg-surface-1 p-8 shadow-[var(--shadow-md)]">
        <p className="text-eyebrow text-primary-700 dark:text-primary-400">
          Welcome back
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Sign in to Subvra
        </h1>
        <p className="mt-1.5 text-[13px] text-slate-500">
          Continue where you left off.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-2xl border border-danger-500/25 bg-danger-500/5 px-3.5 py-3 text-[12px] leading-relaxed text-danger-600"
          >
            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          className="press mt-6 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-hairline bg-surface-1 text-[13px] font-medium text-foreground transition-colors duration-200 hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-hairline" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface-1 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              or email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl border border-hairline bg-surface-1 px-3.5 text-sm text-foreground transition-[border-color] duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:hover:border-slate-600"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11 w-full rounded-xl border border-hairline bg-surface-1 px-3.5 text-sm text-foreground transition-[border-color] duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:hover:border-slate-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="press mt-2 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-foreground text-[13px] font-semibold text-background transition-opacity duration-200 hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && (
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-slate-500">
          New here?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-primary-700 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
