import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import NuddEngineeringRiskArticle from "@/app/resources/nudd-engineering-risk";
import JsonLd from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/resources/nudd-engineering-risk/"],
  description:
    "NUDD is a fast front-end uncertainty scan for automotive teams adopting consumer-electronics technology. Learn how to turn New/Unique/Different/Difficult findings into concrete reliability evidence.",
  keywords: [
    "NUDD",
    "new unique different difficult",
    "risk assessment",
    "automotive reliability",
    "DFMEA",
    "DRBFM",
    "DVP&R",
    "mission profile",
    "derivative design",
    "design review",
  ],
  openGraph: {
    title: ogTitle("/resources/nudd-engineering-risk/"),
    description:
      "A fast front-end uncertainty scan for automotive teams adopting consumer-electronics technology, and how to turn NUDD findings into concrete reliability evidence.",
    url: "https://www.reliatools.com/resources/nudd-engineering-risk",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: {
    canonical: "https://www.reliatools.com/resources/nudd-engineering-risk",
  },
};

export default function NuddEngineeringRiskPage() {
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: "NUDD: What Automotive Can Learn from Consumer Electronics",
          description:
            "NUDD is a fast front-end uncertainty scan for automotive teams adopting consumer-electronics technology. Learn how to turn New/Unique/Different/Difficult findings into concrete reliability evidence.",
          path: "/resources/nudd-engineering-risk",
          datePublished: "2026-08-30",
        })}
      />
      <NuddEngineeringRiskArticle />
    </>
  );
}
