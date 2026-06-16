import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Psychrometrics Calculator — Humidity & Dew Point",
  description:
    "Calculate dew point, wet-bulb temperature, absolute humidity, and moisture-related parameters for reliability and environmental test planning of electronics in humid environments.",
  openGraph: {
    title: "Psychrometrics Calculator | Reliatools",
    description:
      "Calculate dew point, wet-bulb temperature, and humidity parameters for reliability and environmental test planning.",
    url: "https://www.reliatools.com/tools/Psychrometrics",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Psychrometrics" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
