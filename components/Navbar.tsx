"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Tools", href: "/tools" },
  { label: "Resources", href: "/resources" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="w-full bg-white shadow-sm sticky top-0 z-50">
        {/* Slim Google AdSense Banner */}
        <div className="max-w-7xl mx-auto px-6 py-1">
          <div className="w-full flex items-center justify-center overflow-hidden border border-gray-300 bg-gray-50 rounded-md" style={{ maxHeight: '60px' }}>
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: "200px" }}
              data-ad-client="ca-pub-9300099645509490"
              data-ad-slot="2792740719"
              data-ad-format="horizontal"
              data-full-width-responsive="false"
            ></ins>
            <Script id="adsbygoogle-init" strategy="afterInteractive">
              {`(adsbygoogle = window.adsbygoogle || []).push({});`}
            </Script>
          </div>
        </div>

        {/* Logo + Navigation */}
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
      </header>
    </>
  );
}
