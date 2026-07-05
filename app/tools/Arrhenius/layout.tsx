import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arrhenius Acceleration Factor Calculator (Free Online Tool)",
  description:
    "Free online Arrhenius acceleration factor calculator. Compute thermal AF and equivalent test duration for accelerated life testing. No signup required.",
  openGraph: {
    title: "Arrhenius Acceleration Factor Calculator (Free Online Tool) | Reliatools",
    description:
      "Free online Arrhenius acceleration factor calculator. Compute thermal AF and equivalent test duration for accelerated life testing. No signup required.",
    url: "https://www.reliatools.com/tools/Arrhenius",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Arrhenius" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
