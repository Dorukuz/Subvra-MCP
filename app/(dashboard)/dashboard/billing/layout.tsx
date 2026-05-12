import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing — Subvra",
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
