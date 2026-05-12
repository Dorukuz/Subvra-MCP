import { termsContent } from "@/content/legal/terms";
import { LegalPage } from "@/components/marketing/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Subvra",
  description: "Subvra terms of service and usage agreement.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title={termsContent.title}
      lastUpdated={termsContent.lastUpdated}
      sections={termsContent.sections}
    />
  );
}
