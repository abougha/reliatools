import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/testplangenerator/"],
  description:
    "Free online reliability test plan generator. Turn a mission profile into a DVP&R with test methods, sample sizes, and acceptance criteria. No signup required.",
  openGraph: {
    title: ogTitle("/tools/testplangenerator/"),
    description:
      "Free online reliability test plan generator. Turn a mission profile into a DVP&R with test methods, sample sizes, and acceptance criteria. No signup required.",
    url: "https://www.reliatools.com/tools/testplangenerator",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/testplangenerator" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Reliability Test Plan Generator",
          description:
            "Turn a mission profile into a DVP&R with test methods, sample sizes, and acceptance criteria.",
          path: "/tools/testplangenerator",
        })}
      />
      {children}
    </>
  );
}
