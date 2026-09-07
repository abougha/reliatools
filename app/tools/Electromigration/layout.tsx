import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/Electromigration/"],
  description:
    "Free online electromigration MTTF calculator using Black's equation. Estimate interconnect lifetime from current density and temperature. No signup required.",
  openGraph: {
    title: ogTitle("/tools/Electromigration/"),
    description:
      "Free online electromigration MTTF calculator using Black's equation. Estimate interconnect lifetime from current density and temperature. No signup required.",
    url: "https://www.reliatools.com/tools/Electromigration",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Electromigration" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Electromigration MTTF Calculator",
          description:
            "Estimate interconnect lifetime from current density and temperature using Black's equation.",
          path: "/tools/Electromigration",
        })}
      />
      {children}
    </>
  );
}
