import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reliability Engineering Tools",
  description:
    "Free online reliability engineering calculators and wizards: Arrhenius, Weibull, Coffin-Manson, Sample Size, Mission Profile, HALT/HASS, RBD, and more — built for validation and test engineers.",
  openGraph: {
    title: "Reliability Engineering Tools | Reliatools",
    description:
      "Free online reliability engineering calculators and wizards: Arrhenius, Weibull, Coffin-Manson, Sample Size, Mission Profile, HALT/HASS, RBD, and more.",
    url: "https://www.reliatools.com/tools",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools" },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
