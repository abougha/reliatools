// app/layout.tsx
import "../globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import DarkModeToggle from "../components/DarkModeToggle";

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
        {/* Dark Mode Toggle in top-right */}
        <DarkModeToggle />

        {/* Global Navbar */}
        <Navbar />

        {/* Page content */}
        {children}
      </body>
    </html>
  );
}
