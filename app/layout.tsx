// app/layout.tsx
import "../styles/globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import Link from "next/link";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Reliatools",
  description: "Reliability Engineering Tools and Calculators",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-white text-gray-900 antialiased font-sans">
        {/* Shared Navigation */}
        <header className="flex items-center justify-between px-6 py-4 shadow-sm bg-white">
          <Link href="/" className="text-xl font-bold text-blue-600">Reliatools</Link>
          <nav className="space-x-6 text-sm font-medium">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <Link href="/about" className="hover:text-blue-600">About</Link>
            <Link href="/tools" className="hover:text-blue-600">Tools</Link>
          </nav>
        </header>
        
        {/* Page Content */}
        <main>{children}</main>
      </body>
    </html>
  );
}
