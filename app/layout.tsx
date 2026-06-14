// app/layout.tsx
import "../styles/globals.css";
import "katex/dist/katex.min.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import PublicSiteChrome from "../components/PublicSiteChrome";

// Import Geist font family
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// Global Metadata: Add Here
export const metadata: Metadata = {
  title: {
    default: "Reliatools | Reliability Engineering Tools for Testing & Analysis",
    template: "%s | Reliatools",
  },
  description: "Free online calculators for reliability engineers: Arrhenius, Coffin-Manson, Sample Size, and more. Boost your reliability testing efficiency.",
  keywords: ["Reliability Engineering", "Arrhenius", "Weibull Analysis", "Sample Size", "Testing Tools", "Reliability Tools", "Reliability Calculator"],
  openGraph: {
    siteName: "Reliatools",
    type: "website",
    locale: "en_US",
  },
  metadataBase: new URL("https://www.reliatools.com"),
  other: {
    "google-adsense-account": "ca-pub-9300099645509490", // Added AdSense meta tag here
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Google Analytics GA4 Script */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-9TMY964ETQ"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-9TMY964ETQ');
            `,
          }}
        />
      </head>
      <body className="antialiased bg-white text-gray-900 dark:bg-black dark:text-white transition-colors duration-300">
        <PublicSiteChrome>{children}</PublicSiteChrome>
      </body>
    </html>
  );
}

