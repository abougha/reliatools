"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Shared with the inline consent snippet in PublicSiteChrome.tsx, which reads
// the stored choice before Google Analytics and AdSense load.
export const CONSENT_STORAGE_KEY = "rt-consent";
export const CONSENT_OPEN_EVENT = "rt-consent-open";

type Choice = "granted" | "denied";

function applyChoice(choice: Choice) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  window.gtag?.("consent", "update", {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  });
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored !== "granted" && stored !== "denied") setVisible(true);
    } catch {
      setVisible(true);
    }

    const reopen = () => setVisible(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!visible) return null;

  const choose = (choice: Choice) => {
    applyChoice(choice);
    setVisible(false);
  };

  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)]"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Reliatools uses cookies for Google Analytics and Google AdSense to measure
          traffic and show ads. The calculators work the same either way.{" "}
          <Link href="/privacy/" className="font-medium text-blue-700 underline underline-offset-2">
            Privacy policy
          </Link>
        </p>
        <div className="flex flex-none gap-3">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Accept
          </button>
        </div>
      </div>
    </section>
  );
}
