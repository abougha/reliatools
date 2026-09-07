import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/BurnInWizard/"],
  description:
    "Free online burn-in test calculator and planning wizard. Plan burn-in duration to screen out infant mortality failures before shipment. No signup required.",
  openGraph: {
    title: ogTitle("/tools/BurnInWizard/"),
    description:
      "Free online burn-in test calculator and planning wizard. Plan burn-in duration to screen out infant mortality failures before shipment. No signup required.",
    url: "https://www.reliatools.com/tools/BurnInWizard",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/BurnInWizard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Burn-In Test Calculator & Planning Wizard",
          description:
            "Plan burn-in duration to screen out infant mortality failures before shipment.",
          path: "/tools/BurnInWizard",
        })}
      />
      {children}
    </>
  );
}
