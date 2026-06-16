import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vibration Test Planning Wizard",
  description:
    "Plan random and swept-sine vibration reliability tests for electronics and mechanical assemblies. Calculate PSD profiles, Grms levels, test durations, and acceleration factors from mission profile inputs.",
  openGraph: {
    title: "Vibration Test Planning Wizard | Reliatools",
    description:
      "Plan vibration reliability tests: calculate PSD profiles, Grms levels, test durations, and acceleration factors for electronics and mechanical assemblies.",
    url: "https://www.reliatools.com/tools/VibrationWizard",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/VibrationWizard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
