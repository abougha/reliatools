import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reliability Block Diagram (RBD) Calculator",
  description:
    "Build and analyze Reliability Block Diagrams (RBD) for system-level reliability prediction. Model Series, Parallel, and k-of-n redundancy configurations to compute overall system reliability with an interactive diagram.",
  openGraph: {
    title: "Reliability Block Diagram (RBD) Calculator | Reliatools",
    description:
      "Build RBDs to model Series, Parallel, and k-of-n redundancy configurations and compute overall system reliability with an interactive diagram and CSV export.",
    url: "https://www.reliatools.com/tools/rbd",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/rbd" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
