import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import Derating from "@/app/resources/derating";
import JsonLd from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/resources/derating/"],
  description:
    "Learn how component stress derating reduces overstress risk and extends product life. Covers voltage, temperature, and power derating guidelines for electronic reliability.",
  openGraph: {
    title: ogTitle("/resources/derating/"),
    description:
      "How component stress derating reduces overstress risk and improves long-term reliability in electronics. Covers voltage, temperature, and power derating.",
    url: "https://www.reliatools.com/resources/derating",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: { canonical: "https://www.reliatools.com/resources/derating" },
};

export default function DeratingPage() {
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: "Reliability by Design: A Technical Guide to Component Derating",
          description:
            "A physics-of-failure-based guide to component derating, covering thermal and electrical stress models, design margin, and why derating is critical for modern high-power systems including AI data centers.",
          path: "/resources/derating",
          datePublished: "2026-01-17",
        })}
      />
      <Derating />
    </>
  );
}
