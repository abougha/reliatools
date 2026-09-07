import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/FIT/"],
  description:
    "Free online FIT calculator. Convert between FIT, failure rate, reliability, ppm, MTTF, and fleet failures, then check whether a test plan supports a claimed FIT target at a given confidence.",
  openGraph: {
    title: ogTitle("/tools/FIT/"),
    description:
      "Free online FIT calculator. Convert between FIT, failure rate, reliability, ppm, MTTF, and fleet failures, then check whether a test plan supports a claimed FIT target at a given confidence.",
    url: "https://www.reliatools.com/tools/FIT",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/FIT" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "FIT Calculator",
          description:
            "Convert between FIT, failure rate, reliability, ppm, MTTF, and fleet failures, and check test evidence against a claimed FIT target.",
          path: "/tools/FIT",
        })}
      />
      {children}
    </>
  );
}
