import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Software Reliability Calculator — Bayesian Prediction | Reliatools",
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
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Software Reliability Calculator (Bayesian Prediction)",
          description:
            "Estimate reliability growth and failure intensity from test data using Bayesian methods.",
          path: "/tools/SoftwareBRP",
        })}
      />
      {children}
    </>
  );
}
