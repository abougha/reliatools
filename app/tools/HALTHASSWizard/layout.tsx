import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HALT & HASS Planning Wizard",
  description:
    "Plan Highly Accelerated Life Testing (HALT) and Highly Accelerated Stress Screening (HASS) programs. Define step-stress profiles, operating and destruct limits, and screen effectiveness.",
  openGraph: {
    title: "HALT & HASS Planning Wizard | Reliatools",
    description:
      "Plan HALT and HASS programs: define step-stress profiles, operating limits, destruct limits, and screen effectiveness for electronics reliability.",
    url: "https://www.reliatools.com/tools/HALTHASSWizard",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/HALTHASSWizard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
