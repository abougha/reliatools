import type { Metadata } from "next";
import HALTArticle from "@/app/resources/halt";
import JsonLd from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "HALT Testing — Highly Accelerated Life Testing Guide | Reliatools",
  description:
    "A practical guide to Highly Accelerated Life Testing (HALT). Learn how HALT uses combined thermal and vibration stresses to expose design weaknesses and improve product robustness before launch.",
  openGraph: {
    title: "HALT Testing — Highly Accelerated Life Testing Guide | Reliatools",
    description:
      "How HALT uses combined thermal and vibration stresses to expose design weaknesses and improve product robustness before launch.",
    url: "https://www.reliatools.com/resources/halt",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: { canonical: "https://www.reliatools.com/resources/halt" },
};

export default function HALTArticlePage() {
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: "HALT Testing — Highly Accelerated Life Testing Guide",
          description:
            "A practical guide to Highly Accelerated Life Testing (HALT). Learn how HALT uses combined thermal and vibration stresses to expose design weaknesses and improve product robustness before launch.",
          path: "/resources/halt",
          datePublished: "2025-04-15",
        })}
      />
      <HALTArticle />
    </>
  );
}
