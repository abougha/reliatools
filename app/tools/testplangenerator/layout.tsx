import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DVP&R Test Plan Generator",
  description:
    "Generate a Design Verification Plan and Report (DVP&R) for reliability engineering. Map requirements to test methods, sample sizes, acceptance criteria, and test ownership in a structured format.",
  openGraph: {
    title: "DVP&R Test Plan Generator | Reliatools",
    description:
      "Generate a Design Verification Plan and Report (DVP&R): map requirements to test methods, sample sizes, and acceptance criteria.",
    url: "https://www.reliatools.com/tools/testplangenerator",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/testplangenerator" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
