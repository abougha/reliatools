import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reliability Block Diagram (RBD) Calculator",
  description:
    "Free online reliability block diagram calculator. Model series and parallel system reliability, then compute system MTBF and availability. No signup required.",
  openGraph: {
    title: "Reliability Block Diagram (RBD) Calculator | Reliatools",
    description:
      "Free online reliability block diagram calculator. Model series and parallel system reliability, then compute system MTBF and availability. No signup required.",
    url: "https://www.reliatools.com/tools/rbd",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/rbd" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
