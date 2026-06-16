import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reliability Engineering Resources",
  description:
    "Articles, guides, and case studies on reliability engineering: Arrhenius, Weibull, HALT, thermal shock, component derating, mission profiles, and validation planning.",
  openGraph: {
    title: "Reliability Engineering Resources | Reliatools",
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
