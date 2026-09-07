import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import SoftwareBRPArticle from "@/app/resources/SoftwareBRP-article";
import JsonLd from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/resources/softwarebrp-article/"],
  description:
    "How to structure a Software Business Reliability Program (BRP) for embedded and safety-critical software. Covers reliability requirements, failure mode analysis, verification strategy, and test planning.",
  openGraph: {
    title: ogTitle("/resources/softwarebrp-article/"),
    description:
      "How to structure a Software BRP for embedded and safety-critical software: reliability requirements, failure mode analysis, verification strategy, and test planning.",
    url: "https://www.reliatools.com/resources/softwarebrp-article",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: { canonical: "https://www.reliatools.com/resources/softwarebrp-article" },
};

export default function SoftwareBRPArticlePage() {
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: "Bayesian Reliability Predictor (Software)",
          description:
            "How to estimate software reliability early using Bayesian evidence fusion.",
          path: "/resources/softwarebrp-article",
          datePublished: "2025-10-19",
        })}
      />
      <SoftwareBRPArticle />
    </>
  );
}
