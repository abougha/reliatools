import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reliability Test Sample Size Calculator",
  description:
    "Determine the required sample size for reliability demonstrations using binomial statistics. Input your reliability target, confidence level, and allowed failures to compute minimum test sample size.",
  openGraph: {
    title: "Reliability Test Sample Size Calculator | Reliatools",
    description:
      "Calculate minimum sample size for reliability demonstrations using binomial statistics given a reliability target, confidence level, and allowed failures.",
    url: "https://www.reliatools.com/tools/Samplesize",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Samplesize" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
