import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mission Profile Builder — Duty Cycle & Stress Exposure Tool",
  description:
    "Build quantified environmental duty cycles and stress exposure profiles for reliability planning. Define thermal, vibration, and humidity loads by life phase to ground test planning in real application conditions.",
  openGraph: {
    title: "Mission Profile Builder | Reliatools",
    description:
      "Build quantified duty cycles and stress exposure profiles by life phase to ground reliability test planning in real application conditions.",
    url: "https://www.reliatools.com/tools/MissionProfile",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/MissionProfile" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
