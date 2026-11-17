"use client";

import Link from "next/link";
import BrandMark from "./BrandMark";
import { CONSENT_OPEN_EVENT } from "./CookieConsent";

const FOOTER_LINKS = [
  { href: "/tools", label: "Tools" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
];

const LINK_CLASS =
  "rounded text-sm text-slate-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Link href="/" aria-label="Reliatools home" className="rounded-md">
              <BrandMark />
            </Link>
            <p className="text-sm text-slate-600">Free reliability engineering tools</p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className={LINK_CLASS}
                  onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
                >
                  Cookie settings
                </button>
              </li>
              <li>
                <a
                  href="https://www.buymeacoffee.com/Reliatools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_CLASS}
                >
                  Buy me a coffee
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <p className="max-w-4xl text-xs leading-5 text-slate-500">
            &copy; {new Date().getFullYear()} Reliatools. All rights reserved. The tools and
            content on this site are provided &ldquo;as is&rdquo; without warranties of any
            kind. Reliatools assumes no liability for the accuracy or use of results. Use at
            your own risk.
          </p>
        </div>
      </div>
    </footer>
  );
}
