import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Mission Profile & Duty Cycle Builder for Reliability Testing | Reliatools",
  description:
    "Free online mission profile and duty cycle builder. Map thermal, vibration, and humidity stress exposure across lifecycle phases. No signup required.",
  openGraph: {
    title: "Mission Profile & Duty Cycle Builder for Reliability Testing | Reliatools",
    description:
      "Free online mission profile and duty cycle builder. Map thermal, vibration, and humidity stress exposure across lifecycle phases. No signup required.",
    url: "https://www.reliatools.com/tools/MissionProfile",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/MissionProfile" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Mission Profile & Duty Cycle Builder",
          description:
            "Map thermal, vibration, and humidity stress exposure across lifecycle phases.",
          path: "/tools/MissionProfile",
        })}
      />
      {children}
    </>
  );
}
