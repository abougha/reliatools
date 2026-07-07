import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FIT Calculator — Reliability, ppm, and Test Evidence",
  description:
    "Free online FIT calculator. Convert between FIT, failure rate, reliability, ppm, MTTF, and fleet failures, then check whether a test plan supports a claimed FIT target at a given confidence.",
  openGraph: {
    title: "FIT Calculator — Reliability, ppm, and Test Evidence | Reliatools",
    description:
      "Free online FIT calculator. Convert between FIT, failure rate, reliability, ppm, MTTF, and fleet failures, then check whether a test plan supports a claimed FIT target at a given confidence.",
    url: "https://www.reliatools.com/tools/FIT",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/FIT" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
