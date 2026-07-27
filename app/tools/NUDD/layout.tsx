import type { Metadata } from "next";

const DESCRIPTION =
  "NUDD identifies where deeper risk analysis and validation are needed. It complements — but does not replace — DFMEA, DRBFM or technical risk assessment. Free tool to score New, Unique, Different, and Difficult for each feature or function.";

export const metadata: Metadata = {
  title: "NUDD Assessment — New, Unique, Different, Difficult | Reliatools",
  description: DESCRIPTION,
  openGraph: {
    title: "NUDD Assessment — New, Unique, Different, Difficult | Reliatools",
    description: DESCRIPTION,
    url: "https://www.reliatools.com/tools/NUDD",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/NUDD" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
