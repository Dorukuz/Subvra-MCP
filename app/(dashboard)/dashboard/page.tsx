import { Suspense } from "react";
import { GenerateClient } from "./generate-client";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl p-8 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
      }
    >
      <GenerateClient />
    </Suspense>
  );
}
