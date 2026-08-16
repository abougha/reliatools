import type { Metadata } from "next";
import ThermalShockArticle from "@/app/resources/thermal-shock-article";
import JsonLd from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Thermal Shock, Thermal Cycling, and the Coffin-Manson Model | Reliatools",
  description:
    "How thermal cycling drives fatigue damage in solder joints and electronic assemblies, and how the Coffin-Manson model estimates cycles to failure for accelerated life testing.",
  openGraph: {
    title: "Thermal Shock, Thermal Cycling, and the Coffin-Manson Model | Reliatools",
    description:
      "How thermal cycling drives fatigue damage in electronics and how the Coffin-Manson model estimates cycles to failure for accelerated life testing.",
    url: "https://www.reliatools.com/resources/thermal-shock-article",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: { canonical: "https://www.reliatools.com/resources/thermal-shock-article" },
};

export default function ThermalShockArticlePage() {
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: "Thermal Shock & Coffin-Manson in Microelectronics",
          description:
            "Learn how thermal cycling affects solder joint fatigue using the Coffin-Manson model. Ideal for consumer electronics.",
          path: "/resources/thermal-shock-article",
          datePublished: "2025-06-08",
        })}
      />
      <ThermalShockArticle />
    </>
  );
}
