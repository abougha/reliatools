import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weibull Life Data Analysis",
  description:
    "Analyze reliability life data using Weibull distribution fitting. Estimate shape (β) and scale (η) parameters, B10 life, MTTF, and reliability at any mission time from failure and suspension data.",
  openGraph: {
    title: "Weibull Life Data Analysis | Reliatools",
    description:
      "Fit Weibull distributions to reliability life data. Estimate shape and scale parameters, B10 life, MTTF, and reliability at any mission time.",
    url: "https://www.reliatools.com/tools/Weibull",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Weibull" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
