import { Suspense } from "react";
import { TeamClient } from "./team-client";

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl py-12 text-sm text-slate-500">Loading…</div>
      }
    >
      <TeamClient />
    </Suspense>
  );
}
