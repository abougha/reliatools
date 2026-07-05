import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Burn-In Test Calculator & Planning Wizard",
  description:
    "Free online burn-in test calculator and planning wizard. Plan burn-in duration to screen out infant mortality failures before shipment. No signup required.",
  openGraph: {
    title: "Burn-In Test Calculator & Planning Wizard | Reliatools",
    description:
      "Free online burn-in test calculator and planning wizard. Plan burn-in duration to screen out infant mortality failures before shipment. No signup required.",
    url: "https://www.reliatools.com/tools/BurnInWizard",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/BurnInWizard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
