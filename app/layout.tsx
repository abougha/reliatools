// app/layout.tsx
import "../styles/globals.css";
import 'katex/dist/katex.min.css';
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Script from "next/script";

// Import Geist font family
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// 🎯 Global Metadata: Add Here
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
        {/* Global Navbar */}
        <Navbar />

{/* Global Google AdSense Script */}
        <Script
          id="adsense-script"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
          strategy="afterInteractive"
        />

        {/* Page content */}
        {children}
        <footer className="mt-10 text-center text-sm text-gray-500 py-6 border-t border-gray-200">
    © 2025 Reliatools. All rights reserved. The tools and content on this site are provided “as is” without warranties of any kind. Reliatools assumes no liability for the accuracy or use of results. Use at your own risk.
  </footer>
      </body>
    </html>
  );
}
