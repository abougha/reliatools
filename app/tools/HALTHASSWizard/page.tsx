"use client";

import HALTWizard from "./_components/HALTWizard";
import ContactCTA from "@/components/ContactCTA";
import RelatedLinks from "@/components/RelatedLinks";

export default function HALTHASSWizardPage() {
  return (
    <>
      <HALTWizard />
      <div className="mx-auto max-w-3xl px-6">
        <RelatedLinks route="/tools/HALTHASSWizard/" />
        <ContactCTA variant="tool" />
      </div>
    </>
  );
}
