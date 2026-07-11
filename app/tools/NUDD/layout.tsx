import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NUDD Assessment — New, Unique, Different, Difficult | Reliatools",
  description:
    "Free NUDD assessment tool. Score what is New, Unique, Different, and Difficult for each feature or function, then focus engineering effort where uncertainty is highest.",
  openGraph: {
    title: "NUDD Assessment — New, Unique, Different, Difficult | Reliatools",
    description:
      "Free NUDD assessment tool. Score what is New, Unique, Different, and Difficult for each feature or function, then focus engineering effort where uncertainty is highest.",
    url: "https://www.reliatools.com/tools/NUDD",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/NUDD" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
