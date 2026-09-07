import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES, TITLE_TEMPLATE } from "@/lib/seo/titles";

export const metadata: Metadata = {
  title: {
    default: PAGE_NAMES["/resources/"],
    template: TITLE_TEMPLATE,
  },
  description:
    "Articles, guides, and case studies on reliability engineering: Arrhenius, Weibull, HALT, thermal shock, component derating, mission profiles, and validation planning.",
  openGraph: {
    title: ogTitle("/resources/"),
    description:
      "Articles, guides, and case studies on reliability engineering: Arrhenius, HALT, thermal shock, derating, mission profiles, and validation planning.",
    url: "https://www.reliatools.com/resources",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/resources" },
};

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
