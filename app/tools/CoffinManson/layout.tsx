import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Coffin-Manson Thermal Fatigue Calculator — Cycles to Failure | Reliatools",
  description:
    "Free online Coffin-Manson thermal fatigue calculator. Estimate cycles to failure from thermal cycling and CTE mismatch data. No signup required.",
  openGraph: {
    title: "Coffin-Manson Thermal Fatigue Calculator — Cycles to Failure | Reliatools",
    description:
      "Free online Coffin-Manson thermal fatigue calculator. Estimate cycles to failure from thermal cycling and CTE mismatch data. No signup required.",
    url: "https://www.reliatools.com/tools/CoffinManson",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/CoffinManson" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Coffin-Manson Thermal Fatigue Calculator",
          description:
            "Estimate cycles to failure from thermal cycling and CTE mismatch data.",
          path: "/tools/CoffinManson",
        })}
      />
      {children}
    </>
  );
}
