"use client";

import HALTWizard from "./_components/HALTWizard";
import ContactCTA from "@/components/ContactCTA";

export default function HALTHASSWizardPage() {
  return (
    <>
      <HALTWizard />
      <div className="mx-auto max-w-3xl px-6">
        <ContactCTA variant="tool" />
      </div>
    </>
  );
}
