import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import HALTArticle from "@/app/resources/halt";
import JsonLd from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/resources/halt/"],
  description:
    "A practical guide to HALT testing: cold, hot and vibration step-stress, functional and destruct limits, classical vs. rapid HALT, and how HASS follows in production. Plan a profile with the free HALT/HASS builder.",
  openGraph: {
    title: ogTitle("/resources/halt/"),
    description:
      "HALT step-stress profiles, functional and destruct limits, and how HASS follows in production.",
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
          title: "HALT Testing Guide: Step-Stress, Limits & HASS",
          description:
            "A practical guide to HALT testing: cold, hot and vibration step-stress, functional and destruct limits, classical vs. rapid HALT, and how HASS follows in production. Plan a profile with the free HALT/HASS builder.",
          path: "/resources/halt",
          datePublished: "2025-04-15",
        })}
      />
      <HALTArticle />
    </>
  );
}
