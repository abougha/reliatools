import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Psychrometric Calculator — Humidity, Wet Bulb, Enthalpy | Reliatools",
  description:
    "Free online psychrometric calculator. Compute humidity, wet bulb temperature, dew point, and enthalpy for environmental test planning. No signup required.",
  openGraph: {
    title: "Psychrometric Calculator — Humidity, Wet Bulb, Enthalpy | Reliatools",
    description:
      "Free online psychrometric calculator. Compute humidity, wet bulb temperature, dew point, and enthalpy for environmental test planning. No signup required.",
    url: "https://www.reliatools.com/tools/Psychrometrics",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Psychrometrics" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Psychrometric Calculator",
          description:
            "Compute humidity, wet bulb temperature, dew point, and enthalpy for environmental test planning.",
          path: "/tools/Psychrometrics",
        })}
      />
      {children}
    </>
  );
}
