import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/Arrhenius/"],
  description:
    "Free online Arrhenius acceleration factor calculator. Compute thermal AF and equivalent test duration for accelerated life testing. No signup required.",
  openGraph: {
    title: ogTitle("/tools/Arrhenius/"),
    description:
      "Free online Arrhenius acceleration factor calculator. Compute thermal AF and equivalent test duration for accelerated life testing. No signup required.",
    url: "https://www.reliatools.com/tools/Arrhenius",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Arrhenius" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Arrhenius Acceleration Factor Calculator",
          description:
            "Compute thermal acceleration factors and equivalent test duration for accelerated life testing.",
          path: "/tools/Arrhenius",
        })}
      />
      {children}
    </>
  );
}
