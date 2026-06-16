import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Electromigration MTTF Calculator — Black's Equation",
  description:
    "Calculate electromigration mean time to failure (MTTF) for metal interconnects using Black's equation. Assess current density and temperature effects on IC and PCB trace reliability.",
  openGraph: {
    title: "Electromigration MTTF Calculator | Reliatools",
    description:
      "Calculate electromigration MTTF using Black's equation. Assess current density and temperature effects on IC interconnect reliability.",
    url: "https://www.reliatools.com/tools/Electromigration",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Electromigration" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
