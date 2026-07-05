import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "P-Diagram Generator for Robust Design",
  description:
    "Free online P-Diagram generator for robust design. Map signal, control, and noise factors and error states for DFMEA and design reviews. No signup required.",
  openGraph: {
    title: "P-Diagram Generator for Robust Design | Reliatools",
    description:
      "Free online P-Diagram generator for robust design. Map signal, control, and noise factors and error states for DFMEA and design reviews. No signup required.",
    url: "https://www.reliatools.com/tools/p-diagram",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/p-diagram" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
