"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import BrandMark from "./BrandMark";
import { TOOL_GROUPS } from "@/lib/toolGroups";

const PRIMARY_LINKS = [
  { href: "/resources/", label: "Resources" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

export default function Navbar() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    const base = href.replace(/\/+$/, "");
    const path = (pathname ?? "").replace(/\/+$/, "");
    return path === base || path.startsWith(`${base}/`);
  };

  // Close menus on navigation.
  useEffect(() => {
    setToolsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Close the Tools menu on Escape or a click outside it.
  useEffect(() => {
    if (!toolsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setToolsOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!toolsRef.current?.contains(e.target as Node)) setToolsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [toolsOpen]);

  const linkClass = (active: boolean) =>
    [
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      FOCUS_RING,
      active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ");

  return (
    <header className="relative z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className={`rounded-md ${FOCUS_RING}`} aria-label="Reliatools home">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <div ref={toolsRef}>
            <button
              type="button"
              onClick={() => setToolsOpen((open) => !open)}
              aria-expanded={toolsOpen}
              aria-controls="tools-menu"
              className={`inline-flex items-center gap-1 ${linkClass(isActive("/tools"))}`}
            >
              Tools
              <ChevronDown
                className={`h-4 w-4 transition-transform ${toolsOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {toolsOpen && (
              <div
                id="tools-menu"
                className="absolute inset-x-0 top-full border-b border-slate-200 bg-white shadow-lg"
              >
                <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
                  {TOOL_GROUPS.map((group) => (
                    <div key={group.id}>
                      <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                      <ul className="mt-3 space-y-1">
                        {group.tools.map((tool) => (
                          <li key={tool.href}>
                            <Link
                              href={tool.href}
                              className={`-mx-2 block rounded-md px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 ${FOCUS_RING}`}
                            >
                              {tool.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 bg-slate-50">
                  <div className="mx-auto max-w-7xl px-6 py-3 lg:px-8">
                    <Link
                      href="/tools/"
                      className={`inline-flex items-center gap-2 rounded text-sm font-semibold text-blue-700 hover:text-blue-800 ${FOCUS_RING}`}
                    >
                      View all tools with formulas
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {PRIMARY_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isActive(link.href))}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/tools/"
            className={`hidden items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:inline-flex ${FOCUS_RING}`}
          >
            Explore Tools
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            className={`inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 md:hidden ${FOCUS_RING}`}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
            Menu
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-menu"
          aria-label="Primary"
          className="border-t border-slate-200 bg-white px-4 pb-6 pt-2 md:hidden"
        >
          <ul className="divide-y divide-slate-100">
            {[{ href: "/tools/", label: "All tools" }, ...PRIMARY_LINKS].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block py-3 text-base font-medium ${
                    isActive(link.href) ? "text-blue-700" : "text-slate-800"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {TOOL_GROUPS.map((group) => (
            <div key={group.id} className="mt-5">
              <p className="text-sm font-semibold text-slate-900">{group.title}</p>
              <ul className="mt-1">
                {group.tools.map((tool) => (
                  <li key={tool.href}>
                    <Link href={tool.href} className="block py-2 text-sm text-slate-600">
                      {tool.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
