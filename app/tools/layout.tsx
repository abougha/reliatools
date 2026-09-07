import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES, TITLE_TEMPLATE } from "@/lib/seo/titles";

export const metadata: Metadata = {
  title: {
    default: PAGE_NAMES["/tools/"],
    template: TITLE_TEMPLATE,
  },
  description:
    "Free online reliability engineering calculators: Arrhenius, Weibull, Coffin-Manson, sample size, HALT/HASS, and RBD calculator tools for validation engineers.",
  openGraph: {
    title: ogTitle("/tools/"),
    description:
      "Free online reliability engineering calculators: Arrhenius, Weibull, Coffin-Manson, sample size, HALT/HASS, and RBD calculator tools for validation engineers.",
    url: "https://www.reliatools.com/tools",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools" },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
