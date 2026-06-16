import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Software Reliability Program (BRP) Tool",
  description:
    "Plan and structure a Software Business Reliability Program (BRP). Map software reliability requirements, failure modes, and verification strategies for embedded and safety-critical software products.",
  openGraph: {
    title: "Software Reliability Program (BRP) Tool | Reliatools",
    description:
      "Map software reliability requirements, failure modes, and verification strategies for embedded and safety-critical software using the BRP framework.",
    url: "https://www.reliatools.com/tools/SoftwareBRP",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/SoftwareBRP" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
