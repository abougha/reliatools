import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/HALTHASSWizard/"],
  description:
    "Free online HALT/HASS test plan builder. Define step-stress profiles, operating and destruct limits for accelerated stress screening. No signup required.",
  openGraph: {
    title: ogTitle("/tools/HALTHASSWizard/"),
    description:
      "Free online HALT/HASS test plan builder. Define step-stress profiles, operating and destruct limits for accelerated stress screening. No signup required.",
    url: "https://www.reliatools.com/tools/HALTHASSWizard",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/HALTHASSWizard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "HALT/HASS Test Plan Builder",
          description:
            "Define step-stress profiles, operating and destruct limits for accelerated stress screening.",
          path: "/tools/HALTHASSWizard",
        })}
      />
      {children}
    </>
  );
}
