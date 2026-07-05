import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Software Reliability Calculator — Bayesian Prediction",
  description:
    "Free online Bayesian software reliability predictor. Estimate reliability growth and failure intensity from test data using Bayesian methods. No signup required.",
  openGraph: {
    title: "Software Reliability Calculator — Bayesian Prediction | Reliatools",
    description:
      "Free online Bayesian software reliability predictor. Estimate reliability growth and failure intensity from test data using Bayesian methods. No signup required.",
    url: "https://www.reliatools.com/tools/SoftwareBRP",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/SoftwareBRP" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
