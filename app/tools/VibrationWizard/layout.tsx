import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: PAGE_NAMES["/tools/VibrationWizard/"],
  description:
    "Free online vibration test PSD calculator and profile builder. Compute Grms levels and test durations from your mission profile. No signup required.",
  openGraph: {
    title: ogTitle("/tools/VibrationWizard/"),
    description:
      "Free online vibration test PSD calculator and profile builder. Compute Grms levels and test durations from your mission profile. No signup required.",
    url: "https://www.reliatools.com/tools/VibrationWizard",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/VibrationWizard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Vibration Test PSD Calculator & Profile Builder",
          description:
            "Compute Grms levels and test durations from your mission profile.",
          path: "/tools/VibrationWizard",
        })}
      />
      {children}
    </>
  );
}
