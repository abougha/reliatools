import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HALT/HASS Test Plan Builder — Step-Stress Profiles",
  description:
    "Free online HALT/HASS test plan builder. Define step-stress profiles, operating and destruct limits for accelerated stress screening. No signup required.",
  openGraph: {
    title: "HALT/HASS Test Plan Builder — Step-Stress Profiles | Reliatools",
    description:
      "Free online HALT/HASS test plan builder. Define step-stress profiles, operating and destruct limits for accelerated stress screening. No signup required.",
    url: "https://www.reliatools.com/tools/HALTHASSWizard",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/HALTHASSWizard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
