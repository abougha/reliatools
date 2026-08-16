import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Reliability Block Diagram (RBD) Calculator | Reliatools",
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
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Reliability Block Diagram (RBD) Calculator",
          description:
            "Model series and parallel system reliability, then compute system MTBF and availability.",
          path: "/tools/rbd",
        })}
      />
      {children}
    </>
  );
}
