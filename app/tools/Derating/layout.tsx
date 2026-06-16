import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Component Derating Calculator",
  description:
    "Apply component stress derating to improve electronic reliability. Calculate derating margins for voltage, current, power, and temperature based on MIL-STD-975 and industry guidelines.",
  openGraph: {
    title: "Component Derating Calculator | Reliatools",
    description:
      "Calculate derating margins for voltage, current, power, and temperature to reduce overstress risk and improve long-term electronic reliability.",
    url: "https://www.reliatools.com/tools/Derating",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Derating" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
