import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coffin-Manson Thermal Cycling Calculator",
  description:
    "Estimate cycles to failure for solder joints and electronic assemblies under thermal cycling using the Coffin-Manson model. Calculate acceleration factors between test and field conditions.",
  openGraph: {
    title: "Coffin-Manson Thermal Cycling Calculator | Reliatools",
    description:
      "Estimate cycles to failure for solder joints under thermal cycling using the Coffin-Manson model and calculate acceleration factors for accelerated life testing.",
    url: "https://www.reliatools.com/tools/CoffinManson",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/CoffinManson" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
