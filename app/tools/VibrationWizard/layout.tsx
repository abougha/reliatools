import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vibration Test PSD Calculator & Profile Builder (GRMS)",
  description:
    "Free online vibration test PSD calculator and profile builder. Compute Grms levels and test durations from your mission profile. No signup required.",
  openGraph: {
    title: "Vibration Test PSD Calculator & Profile Builder (GRMS) | Reliatools",
    description:
      "Free online vibration test PSD calculator and profile builder. Compute Grms levels and test durations from your mission profile. No signup required.",
    url: "https://www.reliatools.com/tools/VibrationWizard",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/VibrationWizard" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
