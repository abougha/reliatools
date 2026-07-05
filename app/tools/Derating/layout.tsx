import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Component Derating Calculator & Navigator (MIL-Style)",
  description:
    "Free online component derating calculator and navigator. Check voltage, current, power, and temperature margins against MIL-style guidelines. No signup required.",
  openGraph: {
    title: "Component Derating Calculator & Navigator (MIL-Style) | Reliatools",
    description:
      "Free online component derating calculator and navigator. Check voltage, current, power, and temperature margins against MIL-style guidelines. No signup required.",
    url: "https://www.reliatools.com/tools/Derating",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Derating" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
