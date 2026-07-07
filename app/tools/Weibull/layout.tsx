import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-weibull-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-weibull-mono",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["italic"],
  variable: "--font-weibull-serif",
});

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
  return (
    <div className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`} style={{ fontFamily: "var(--font-weibull-sans)" }}>
      {children}
    </div>
  );
}
