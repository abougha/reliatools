"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Tools", href: "/tools" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* AdSense script loads once globally */}
      <Script
        id="adsense-script"
        strategy="afterInteractive"
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
      />
      <Script id="adsense-init" strategy="afterInteractive">
        {`(adsbygoogle = window.adsbygoogle || []).push({});`}
      </Script>

      <header className="w-full bg-white shadow-sm sticky top-0 z-50">
        {/* Logo + Nav */}
        <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-20 h-20">
              <Image
                src="/logo.png"
                alt="Reliability Tools Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="sr-only">Reliability Tools</span>
          </Link>

          <nav className="space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${
                  pathname === item.href
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Ad Banner */}
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <ins
            className="adsbygoogle"
            style={{ display: "block", textAlign: "center" }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXX" // <-- Replace with your AdSense ID
            data-ad-slot="YYYYYYYYYYYYYYY" // <-- Replace with your Ad Slot ID
            data-ad-format="auto"
            data-full-width-responsive="true"
          ></ins>
        </div>
      </header>
    </>
  );
}
