import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Electromigration MTTF Calculator (Black's Equation)",
  description:
    "Free online electromigration MTTF calculator using Black's equation. Estimate interconnect lifetime from current density and temperature. No signup required.",
  openGraph: {
    title: "Electromigration MTTF Calculator — Black's Equation | Reliatools",
    description:
      "Free online electromigration MTTF calculator using Black's equation. Estimate interconnect lifetime from current density and temperature. No signup required.",
    url: "https://www.reliatools.com/tools/Electromigration",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Electromigration" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
