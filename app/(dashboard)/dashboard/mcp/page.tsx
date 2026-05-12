"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";

export default function McpAuthPage() {
  const { user, loading, getIdToken } = useAuth();
  const [token, setToken] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const idToken = await getIdToken();
      if (!idToken) throw new Error("Please sign in first.");
      const res = await fetch("/api/mcp/auth-token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttlSeconds: 60 * 60 * 24 }),
      });
      const data = (await res.json()) as {
        token?: string;
        expiresAt?: string;
        error?: string;
        reason?: string;
        hint?: string;
      };
      if (!res.ok || !data.token) {
        const detail = [data.reason, data.hint].filter(Boolean).join(" — ");
        throw new Error(detail || data.error || "Could not generate MCP token.");
      }
      setToken(data.token);
      setExpiresAt(data.expiresAt || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate token.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-eyebrow mb-2 text-primary-700 dark:text-primary-400">MCP</p>
      <h1 className="text-3xl font-semibold text-foreground">Agent Auth Token</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Click generate to create a Subvra MCP token. Then use it in your agent via{" "}
        <span className="font-mono">mcp_auth(action=set)</span> so your tools can call protected
        generation APIs without manually pasting Firebase tokens each time.
      </p>

      <div className="mt-8 rounded-2xl border border-hairline bg-surface-1 p-5">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy || loading || !user}
          className="inline-flex h-10 items-center rounded-full bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:opacity-50"
        >
          {busy ? "Generating..." : "Generate MCP token"}
        </button>
        {!user && !loading && (
          <p className="mt-3 text-sm text-amber-600">Please sign in to create an MCP token.</p>
        )}
        {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
      </div>

      {token && (
        <div className="mt-6 rounded-2xl border border-hairline bg-surface-1 p-5">
          <p className="text-sm font-semibold text-foreground">Your MCP token</p>
          <p className="mt-1 text-xs text-slate-500">
            Expires: {expiresAt ? new Date(expiresAt).toLocaleString() : "n/a"}
          </p>
          <textarea
            readOnly
            value={token}
            className="mt-3 h-32 w-full rounded-xl border border-hairline bg-surface-2 p-3 font-mono text-xs text-foreground"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-full border border-hairline bg-surface-2 px-4 py-1.5 text-xs font-semibold text-foreground"
            >
              {copied ? "Copied" : "Copy token"}
            </button>
            <p className="font-mono text-xs text-slate-500">
              mcp_auth(action=set, authToken=&lt;paste token&gt;)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

