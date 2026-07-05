import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reliability Test Plan Generator — Mission Profile to DVP&R",
  description:
    "Free online reliability test plan generator. Turn a mission profile into a DVP&R with test methods, sample sizes, and acceptance criteria. No signup required.",
  openGraph: {
    title: "Reliability Test Plan Generator — Mission Profile to DVP&R | Reliatools",
    description:
      "Free online reliability test plan generator. Turn a mission profile into a DVP&R with test methods, sample sizes, and acceptance criteria. No signup required.",
    url: "https://www.reliatools.com/tools/testplangenerator",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/testplangenerator" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
