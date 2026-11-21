import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/CoffinManson/"],
  description:
    "Free Coffin-Manson calculator. Work out the acceleration factor of a thermal cycling test versus field conditions, or estimate cycles to failure from strain range. No signup required.",
  openGraph: {
    title: ogTitle("/tools/CoffinManson/"),
    description:
      "Free Coffin-Manson calculator. Work out the acceleration factor of a thermal cycling test versus field conditions, or estimate cycles to failure from strain range. No signup required.",
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
          name: "Coffin-Manson Calculator",
          description:
            "Work out thermal cycling acceleration factors and estimate cycles to failure.",
          path: "/tools/CoffinManson",
        })}
      />
      {children}
    </>
  );
}
