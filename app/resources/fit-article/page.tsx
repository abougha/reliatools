import type { Metadata } from "next";
import FitArticle from "@/app/resources/fit-article";

export const metadata: Metadata = {
  title:
    "What Does 1 FIT Really Mean? Automotive Reliability, PMHF & ASIL Explained",
  description:
    "What 1 FIT really means: mission ppm, expected fleet failures, PMHF, ASIL targets, and why ultra-low failure-rate claims need billions of device-hours of evidence.",
  keywords: [
    "FIT",
    "failures in time",
    "PMHF",
    "ASIL",
    "ISO 26262",
    "automotive reliability",
    "functional safety",
    "diagnostic coverage",
    "reliability testing",
  ],
  openGraph: {
    title: "What Does 1 FIT Really Mean? PMHF & ASIL Explained | Reliatools",
    description:
      "Convert a FIT claim into mission ppm, expected fleet failures, and required test evidence, and see how FIT relates to PMHF and ASIL A–D.",
    url: "https://www.reliatools.com/resources/fit-article",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: {
    canonical: "https://www.reliatools.com/resources/fit-article",
  },
};

export default function FitArticlePage() {
  return <FitArticle />;
}
