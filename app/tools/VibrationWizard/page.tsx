import VibrationWizard from "./VibrationWizard";
import ContactCTA from "@/components/ContactCTA";

export default function VibrationWizardPage() {
  return (
    <>
      <VibrationWizard />
      <div className="mx-auto max-w-3xl px-6">
        <ContactCTA variant="tool" />
      </div>
    </>
  );
}
