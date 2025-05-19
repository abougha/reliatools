"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Tools", href: "/tools" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
          {/* Uncomment below if logo still doesn't show and you're debugging
          <img src="/logo.png" alt="Logo" width="40" height="40" />
          */}
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
  );
}
