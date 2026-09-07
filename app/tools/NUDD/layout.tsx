import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

const DESCRIPTION =
  "NUDD identifies where deeper risk analysis and validation are needed. It complements — but does not replace — DFMEA, DRBFM or technical risk assessment. Free tool to score New, Unique, Different, and Difficult for each feature or function.";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/NUDD/"],
  description: DESCRIPTION,
  openGraph: {
    title: ogTitle("/tools/NUDD/"),
    description: DESCRIPTION,
    url: "https://www.reliatools.com/tools/NUDD",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/NUDD" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "NUDD Assessment",
          description: DESCRIPTION,
          path: "/tools/NUDD",
        })}
      />
      {children}
    </>
  );
}
