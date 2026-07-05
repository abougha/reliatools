import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weibull Analysis Calculator — Probability Plot, Beta & Eta",
  description:
    "Free online Weibull analysis calculator. Fit failure data to estimate beta, eta, B10 life, and reliability at any mission time. No signup required.",
  openGraph: {
    title: "Weibull Analysis Calculator — Probability Plot, Beta & Eta | Reliatools",
    description:
      "Free online Weibull analysis calculator. Fit failure data to estimate beta, eta, B10 life, and reliability at any mission time. No signup required.",
    url: "https://www.reliatools.com/tools/Weibull",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Weibull" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
