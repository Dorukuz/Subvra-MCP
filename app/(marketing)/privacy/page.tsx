import { privacyContent } from "@/content/legal/privacy";
import { LegalPage } from "@/components/marketing/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Subvra",
  description: "How Subvra handles your data and privacy.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title={privacyContent.title}
      lastUpdated={privacyContent.lastUpdated}
      sections={privacyContent.sections}
    />
  );
}
