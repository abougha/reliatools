import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arrhenius Acceleration Factor Calculator",
  description:
    "Calculate thermal acceleration factors (AF) using the Arrhenius model. Estimate how much faster failures occur at elevated test temperatures compared to normal use conditions.",
  openGraph: {
    title: "Arrhenius Acceleration Factor Calculator | Reliatools",
    description:
      "Calculate thermal acceleration factors using the Arrhenius model for temperature-driven aging and accelerated reliability testing.",
    url: "https://www.reliatools.com/tools/Arrhenius",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Arrhenius" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
