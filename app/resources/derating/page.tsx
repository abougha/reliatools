import type { Metadata } from "next";
import Derating from "@/app/resources/derating";

export const metadata: Metadata = {
  title: "Component Derating in Electronics — Reliability by Design",
  description:
    "Learn how component stress derating reduces overstress risk and extends product life. Covers voltage, temperature, and power derating guidelines for electronic reliability.",
  openGraph: {
    title: "Component Derating in Electronics — Reliability by Design | Reliatools",
    description:
      "How component stress derating reduces overstress risk and improves long-term reliability in electronics. Covers voltage, temperature, and power derating.",
    url: "https://www.reliatools.com/resources/derating",
    siteName: "Reliatools",
    type: "article",
  },
  alternates: { canonical: "https://www.reliatools.com/resources/derating" },
};

export default function DeratingPage() {
  return <Derating />;
}
