"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";

type NavChild = { label: string; href: string };
type NavItem =
  | { label: string; href: string; children?: never }
  | { label: string; href: string; children: NavChild[] };

const SIDEBAR_WIDTH = 200; // px
const HEADER_OFFSET = 40; // px (height of sticky AdSense header area)

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  {
    label: "Tools",
    href: "/tools",
    children: [
      { label: "Arrhenius Calculator", href: "/tools/Arrhenius" },
      { label: "Electromigration", href: "/tools/Electromigration" },
      { label: "Burn-In Wizard", href: "/tools/BurnInWizard" },
      { label: "Sample Size (Binomial)", href: "/tools/SampleSize" },
      { label: "Coffin-Manson", href: "/tools/CoffinManson" },
    ],
  },
  {
    label: "Resources",
    href: "/resources",
    children: [
      { label: "Blog", href: "/blog" },
      { label: "Articles", href: "/resources/articles" },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  // Auto-open parent for current path
  useEffect(() => {
    const next: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if ("children" in item && item.children?.length) {
        next[item.href] = isActive(item.href);
      }
    });
    setOpen((prev) => ({ ...prev, ...next }));
  }, [pathname]);

  const toggleGroup = (href: string) =>
    setOpen((prev) => ({ ...prev, [href]: !prev[href] }));

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      {/* Shift main content so it doesn't sit under the fixed sidebar (desktop) */}
      <style jsx global>{`
        @media (min-width: 768px) {
          body {
            padding-left: ${SIDEBAR_WIDTH}px;
          }
        }
      `}</style>

      {/* Sticky header with AdSense (unchanged) */}
      <header className="w-full bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-1">
          <div
            className="w-full flex items-center justify-center overflow-hidden border border-gray-300 bg-gray-50 rounded-md"
            style={{ maxHeight: "60px" }}
          >
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: "200px" }}
              data-ad-client="ca-pub-9300099645509490"
              data-ad-slot="2792740719"
              data-ad-format="horizontal"
              data-full-width-responsive="false"
            ></ins>
            <Script id="adsbygoogle-init" strategy="afterInteractive">
              {`(adsbygoogle = (window as any).adsbygoogle || []).push({});`}
            </Script>
          </div>
        </div>

        {/* Right-side actions row: mobile hamburger */}
        <div className="max-w-7xl mx-auto px-6 pt-3 pb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex md:hidden items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Open menu"
            title="Open menu"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Menu
          </button>
        </div>
      </header>

      {/* ===== Desktop Sidebar (always visible) =====
          - Starts at very top (top: 0), full-height.
          - We add a spacer equal to HEADER_OFFSET so content begins below the sticky header.
          - The header stays above (z-50 > z-40). */}
      <aside
  className="hidden md:flex fixed left-0 z-40 bg-white shadow-sm border-r border-gray-200 flex-col"
  style={{
    width: SIDEBAR_WIDTH,
    top: HEADER_OFFSET,
    height: `calc(100vh - ${HEADER_OFFSET}px)`,
  }}
  aria-label="Primary navigation"
>

        {/* Spacer so sidebar content starts below the sticky header area */}
        <div style={{ height: HEADER_OFFSET }} aria-hidden />

        {/* Logo — centered relative to sidebar width */}
        <div className="px-4 pb-3 border-b border-gray-200 flex justify-center">
          <Link href="/" className="flex items-center justify-center">
            <div className="relative w-24 h-24">
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
        </div>

        {/* Nav list */}
        <div className="px-3 py-3 overflow-y-auto">
          <NavList
            isActive={isActive}
            open={open}
            toggleGroup={toggleGroup}
            onNavigate={() => {}}
          />
        </div>
      </aside>

      {/* ===== Mobile Drawer (overlays content) ===== */}
      {/* Overlay */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden",
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={closeDrawer}
        aria-hidden={!drawerOpen}
      />
      {/* Drawer panel */}
      <aside
  className={[
    "fixed left-0 top-0 z-50 h-screen bg-white shadow-xl border-r border-gray-200 md:hidden",
    "transform transition-transform duration-300",
    drawerOpen ? "translate-x-0" : "-translate-x-full",
  ].join(" ")}
  style={{ width: SIDEBAR_WIDTH }}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        {/* Start content below sticky header area */}
        <div className="pt-[132px] px-3 pb-4 overflow-y-auto h-full">
          {/* Centered logo in drawer */}
          <div className="px-1 pb-3 border-b border-gray-200 mb-3 flex justify-center">
            <Link href="/" onClick={closeDrawer} className="flex items-center justify-center">
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
          </div>

          {/* Close button */}
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close menu"
            >
              Close
            </button>
          </div>

          <NavList
            isActive={isActive}
            open={open}
            toggleGroup={toggleGroup}
            onNavigate={closeDrawer}
          />
        </div>
      </aside>
    </>
  );
}

/** Shared Nav rendering for drawer & sidebar */
function NavList({
  isActive,
  open,
  toggleGroup,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  open: Record<string, boolean>;
  toggleGroup: (href: string) => void;
  onNavigate: () => void;
}) {
  return (
    <nav className="text-sm">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const hasChildren = "children" in item && item.children?.length;
          const isOpen = open[item.href];

          return (
            <li key={item.href}>
              <div
                className={[
                  "flex items-center w-full px-3 py-2 rounded-lg transition",
                  active
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                <Link href={item.href} className="flex-1 min-w-0" onClick={onNavigate}>
                  {item.label}
                </Link>

                {hasChildren && (
                  <button
                    type="button"
                    aria-expanded={!!isOpen}
                    aria-controls={`submenu-${item.href}`}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleGroup(item.href);
                    }}
                    className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Expand menu"
                  >
                    <svg
                      className={[
                        "w-4 h-4 transition-transform",
                        isOpen ? "rotate-180" : "rotate-0",
                      ].join(" ")}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {hasChildren && (
                <ul
                  id={`submenu-${item.href}`}
                  className={[
                    "ml-2 mt-1 overflow-hidden transition-all",
                    isOpen ? "max-h-96" : "max-h-0",
                  ].join(" ")}
                >
                  {(item as Extract<NavItem, { children: NavChild[] }>).children.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={onNavigate}
                          className={[
                            "block px-3 py-1.5 rounded-md text-[0.95rem] transition",
                            childActive
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                          ].join(" ")}
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
