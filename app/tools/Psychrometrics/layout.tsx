import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Psychrometric Calculator — Humidity, Wet Bulb, Enthalpy",
  description:
    "Free online psychrometric calculator. Compute humidity, wet bulb temperature, dew point, and enthalpy for environmental test planning. No signup required.",
  openGraph: {
    title: "Psychrometric Calculator — Humidity, Wet Bulb, Enthalpy | Reliatools",
    description:
      "Free online psychrometric calculator. Compute humidity, wet bulb temperature, dew point, and enthalpy for environmental test planning. No signup required.",
    url: "https://www.reliatools.com/tools/Psychrometrics",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Psychrometrics" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
