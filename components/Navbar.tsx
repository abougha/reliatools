"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Tools", href: "/tools" },
   { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Navbar */}
      <header className="w-full bg-white shadow-sm sticky top-0 z-50">
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

        {/* Ad Banner (Horizontal Slim) */}
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="w-full h-[70px] flex items-center justify-center overflow-hidden">
            <ins
              className="adsbygoogle"
              style={{
                display: "block",
                width: "100%",
                height: "70px",
                textAlign: "center",
              }}
              data-ad-client="ca-pub-9300099645509490" // Replace with your AdSense publisher ID
              data-ad-slot="f08c47fec0942fa0"           // Replace with your Ad Slot ID
              data-ad-format="horizontal"
              data-full-width-responsive="false"
            ></ins>
          </div>
        </div>
      </header>
    </>
  );
}
