import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/Derating/"],
  description:
    "Free online component derating calculator and navigator. Check voltage, current, power, and temperature margins against MIL-style guidelines. No signup required.",
  openGraph: {
    title: ogTitle("/tools/Derating/"),
    description:
      "Free online component derating calculator and navigator. Check voltage, current, power, and temperature margins against MIL-style guidelines. No signup required.",
    url: "https://www.reliatools.com/tools/Derating",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Derating" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Component Derating Calculator & Navigator",
          description:
            "Check voltage, current, power, and temperature margins against MIL-style derating guidelines.",
          path: "/tools/Derating",
        })}
      />
      {children}
    </>
  );
}
