import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import ArrheniusArticle from "@/app/resources/arrhenius-article";
import JsonLd from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/resources/arrhenius-article/"],
  description:
    "How the Arrhenius model calculates thermal acceleration factors for temperature-driven failure mechanisms. Includes worked examples and guidance on activation energy selection for reliability testing.",
  openGraph: {
    title: ogTitle("/resources/arrhenius-article/"),
    description:
      "How the Arrhenius model calculates thermal acceleration factors for temperature-driven failure mechanisms, with worked examples and activation energy guidance.",
    url: "https://www.reliatools.com/resources/arrhenius-article",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: { canonical: "https://www.reliatools.com/resources/arrhenius-article" },
};

export default function ArrheniusArticlePage() {
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: "Understanding Arrhenius for Reliability",
          description:
            "A deep dive into thermal aging models and their application in reliability engineering.",
          path: "/resources/arrhenius-article",
          datePublished: "2025-05-27",
        })}
      />
      <ArrheniusArticle />
    </>
  );
}
