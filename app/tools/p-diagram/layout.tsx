import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "P-Diagram (Parameter Diagram) Tool",
  description:
    "Create parameter diagrams (P-Diagrams) for reliability and robustness engineering. Identify signal factors, control factors, noise factors, and error states to support DFMEA, design reviews, and validation planning.",
  openGraph: {
    title: "P-Diagram (Parameter Diagram) Tool | Reliatools",
    description:
      "Create P-Diagrams to identify signal, control, and noise factors and error states for DFMEA, design reviews, and reliability validation planning.",
    url: "https://www.reliatools.com/tools/p-diagram",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/p-diagram" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
