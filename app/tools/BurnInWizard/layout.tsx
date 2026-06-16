import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Burn-In Test Planning Wizard",
  description:
    "Plan and size burn-in tests for electronics. Calculate burn-in duration, temperature stress, and screen effectiveness to eliminate infant-mortality failures before field deployment.",
  openGraph: {
    title: "Burn-In Test Planning Wizard | Reliatools",
    description:
      "Plan burn-in tests for electronics: calculate duration, temperature stress, and screen effectiveness to eliminate infant-mortality failures.",
    url: "https://www.reliatools.com/tools/BurnInWizard",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/BurnInWizard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
