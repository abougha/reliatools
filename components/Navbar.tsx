"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";

type ToolItem = {
  id?: string;
  title?: string;
  route?: string;
  description?: string;
  formulaLatex?: string;
};

const SIDEBAR_WIDTH = 200; // px (adjust to make narrower/wider)
const HEADER_OFFSET = 40; // px (height of sticky AdSense header area)

export default function Navbar() {
  const pathname = usePathname();

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  // Submenu open state (we only use "tools" here)
  const [toolsOpen, setToolsOpen] = useState(false);

  // Tools list loaded from /tools.json
  const [calculators, setCalculators] = useState<ToolItem[]>([]);

  // Load calculators for Tools submenu
  useEffect(() => {
    fetch("/tools.json")
      .then((res) => res.json())
      .then((data: ToolItem[]) => setCalculators(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load tools list:", err));
  }, []);

  // Auto-open Tools when current path is under /tools
  useEffect(() => {
    setToolsOpen(Boolean(pathname?.startsWith("/tools")));
  }, [pathname]);

  // Active path helper
  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  // Build href for a tool item robustly
  const toolHref = (t: ToolItem) => t.route ?? (t.id ? `/tools/${t.id}` : "/tools");

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
          - Full-height from top; header overlays it (higher z-index).
          - Spacer makes content start below the sticky header area. */}
      <aside
        className="hidden md:flex fixed left-0 top-0 z-40 bg-white shadow-sm border-r border-gray-200 flex-col"
        style={{ width: SIDEBAR_WIDTH, height: "100vh" }}
        aria-label="Primary navigation"
      >
        {/* Spacer so sidebar content begins under the sticky header */}
        <div style={{ height: HEADER_OFFSET }} aria-hidden />

        {/* Centered logo */}
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
            calculators={calculators}
            toolsOpen={toolsOpen}
            setToolsOpen={setToolsOpen}
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
            calculators={calculators}
            toolsOpen={toolsOpen}
            setToolsOpen={setToolsOpen}
            onNavigate={closeDrawer}
          />
        </div>
      </aside>
    </>
  );

  function NavList({
    isActive,
    calculators,
    toolsOpen,
    setToolsOpen,
    onNavigate,
  }: {
    isActive: (href: string) => boolean;
    calculators: ToolItem[];
    toolsOpen: boolean;
    setToolsOpen: (v: boolean) => void;
    onNavigate: () => void;
  }) {
    return (
      <nav className="text-sm">
        <ul className="space-y-1">
          {/* Home */}
          <li>
            <LinkItem href="/" label="Home" active={isActive("/")} onNavigate={onNavigate} />
          </li>

          {/* About */}
          <li>
            <LinkItem href="/about" label="About" active={isActive("/about")} onNavigate={onNavigate} />
          </li>

          {/* Tools (expandable, auto-generated) */}
          <li>
            <div
              className={[
                "flex items-center w-full px-3 py-2 rounded-lg transition",
                isActive("/tools")
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              <Link href="/tools" className="flex-1 min-w-0" onClick={onNavigate}>
                Tools
              </Link>
              <button
                type="button"
                aria-expanded={toolsOpen}
                aria-controls="submenu-tools"
                onClick={(e) => {
                  e.preventDefault();
                  setToolsOpen(!toolsOpen);
                }}
                className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Expand menu"
              >
                <svg
                  className={["w-4 h-4 transition-transform", toolsOpen ? "rotate-180" : ""].join(" ")}
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
            </div>

            {/* Auto-generated calculators */}
            <ul
              id="submenu-tools"
              className={[
                "ml-2 mt-1 overflow-hidden transition-all",
                toolsOpen ? "max-h-96" : "max-h-0",
              ].join(" ")}
            >
              {calculators.map((tool, idx) => {
                const href = toolHref(tool);
                const title = tool.title ?? tool.id ?? `Tool ${idx + 1}`;
                return (
                  <li key={`${href}-${idx}`}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      className={[
                        "block px-3 py-1.5 rounded-md text-[0.95rem] transition",
                        isActive(href)
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                      ].join(" ")}
                    >
                      {title}
                    </Link>
                  </li>
                );
              })}
              {calculators.length === 0 && (
                <li className="px-3 py-1.5 text-gray-400 text-[0.95rem]">
                  No calculators found.
                </li>
              )}
            </ul>
          </li>

          {/* Resources (flat link, no children) */}
          <li>
            <LinkItem
              href="/resources"
              label="Resources"
              active={isActive("/resources")}
              onNavigate={onNavigate}
            />
          </li>
        </ul>
      </nav>
    );
  }
}

/** Small helper for single-level links */
function LinkItem({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={[
        "block px-3 py-2 rounded-lg transition",
        active ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-700 hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
