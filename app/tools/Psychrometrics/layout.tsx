import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/Psychrometrics/"],
  description:
    "Free online psychrometric calculator. Compute humidity, wet bulb temperature, dew point, and enthalpy for environmental test planning. No signup required.",
  openGraph: {
    title: ogTitle("/tools/Psychrometrics/"),
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
