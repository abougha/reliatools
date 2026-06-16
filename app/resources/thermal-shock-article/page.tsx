import type { Metadata } from "next";
import ThermalShockArticle from "@/app/resources/thermal-shock-article";

export const metadata: Metadata = {
  title: "Thermal Shock, Thermal Cycling, and the Coffin-Manson Model",
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
  return <ThermalShockArticle />;
}
