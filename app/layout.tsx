// app/layout.tsx
import "../styles/globals.css";
import 'katex/dist/katex.min.css';
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";

// Import Geist font family
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Reliatools",
  description: "Engineering tools for reliability professionals",
  icons: {
    icon: "/favicon.ico",
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
      <body className="antialiased bg-white text-gray-900 dark:bg-black dark:text-white transition-colors duration-300">
        {/* Global Navbar */}
        <Navbar />

        {/* Page content */}
        {children}
        <footer className="mt-10 text-center text-sm text-gray-500 py-6 border-t border-gray-200">
    © 2025 Reliatools. All rights reserved. The tools and content on this site are provided “as is” without warranties of any kind. Reliatools assumes no liability for the accuracy or use of results. Use at your own risk.
  </footer>
      </body>
    </html>
  );
}
