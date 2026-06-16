import type { Metadata } from "next";
import ArrheniusArticle from "@/app/resources/arrhenius-article";

export const metadata: Metadata = {
  title: "Arrhenius Model in Reliability Engineering — Thermal Acceleration Explained",
  description:
    "How the Arrhenius model calculates thermal acceleration factors for temperature-driven failure mechanisms. Includes worked examples and guidance on activation energy selection for reliability testing.",
  openGraph: {
    title: "Arrhenius Model in Reliability Engineering | Reliatools",
    description:
      "How the Arrhenius model calculates thermal acceleration factors for temperature-driven failure mechanisms, with worked examples and activation energy guidance.",
    url: "https://www.reliatools.com/resources/arrhenius-article",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: { canonical: "https://www.reliatools.com/resources/arrhenius-article" },
};

export default function ArrheniusArticlePage() {
  return <ArrheniusArticle />;
}
