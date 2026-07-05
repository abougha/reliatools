import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reliability Demonstration Sample Size Calculator (Binomial)",
  description:
    "Free online reliability sample size calculator. Determine binomial test sample sizes for reliability demonstration at your target confidence. No signup required.",
  openGraph: {
    title: "Reliability Demonstration Sample Size Calculator (Binomial) | Reliatools",
    description:
      "Free online reliability sample size calculator. Determine binomial test sample sizes for reliability demonstration at your target confidence. No signup required.",
    url: "https://www.reliatools.com/tools/Samplesize",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Samplesize" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
