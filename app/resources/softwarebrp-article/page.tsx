import type { Metadata } from "next";
import SoftwareBRPArticle from "@/app/resources/SoftwareBRP-article";

export const metadata: Metadata = {
  title: "Software Reliability Program (BRP) — Planning Guide",
  description:
    "How to structure a Software Business Reliability Program (BRP) for embedded and safety-critical software. Covers reliability requirements, failure mode analysis, verification strategy, and test planning.",
  openGraph: {
    title: "Software Reliability Program (BRP) — Planning Guide | Reliatools",
    description:
      "How to structure a Software BRP for embedded and safety-critical software: reliability requirements, failure mode analysis, verification strategy, and test planning.",
    url: "https://www.reliatools.com/resources/softwarebrp-article",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: { canonical: "https://www.reliatools.com/resources/softwarebrp-article" },
};

export default function SoftwareBRPArticlePage() {
  return <SoftwareBRPArticle />;
}
