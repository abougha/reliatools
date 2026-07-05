import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reliability Engineering Tools",
  description:
    "Free online reliability engineering calculators: Arrhenius, Weibull, Coffin-Manson, sample size, HALT/HASS, and RBD calculator tools for validation engineers.",
  openGraph: {
    title: "Reliability Engineering Tools | Reliatools",
    description:
      "Free online reliability engineering calculators: Arrhenius, Weibull, Coffin-Manson, sample size, HALT/HASS, and RBD calculator tools for validation engineers.",
    url: "https://www.reliatools.com/tools",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools" },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
