import { refundContent } from "@/content/legal/refund";
import { LegalPage } from "@/components/marketing/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy — Subvra",
  description: "Subvra refund and cancellation policy.",
};

export default function RefundPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title={refundContent.title}
      lastUpdated={refundContent.lastUpdated}
      sections={refundContent.sections}
    />
  );
}
