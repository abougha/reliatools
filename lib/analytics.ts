// lib/analytics.ts
//
// Fail-safe GA4 event helper.
//
// GA4 is loaded as a raw gtag snippet in components/PublicSiteChrome.tsx
// (measurement ID G-9TMY964ETQ, next/script strategy="afterInteractive").
// That snippet may never run: ad blockers, offline first paint, or the
// static-export build itself. Every call here must therefore be a no-op
// rather than an error, and must never delay the user action it is
// attached to.
//
// PII CONSTRAINT: never pass personally identifiable information as an
// event parameter — no names, email addresses, company names, message
// bodies, or anything else a visitor typed about themselves. Parameters
// are limited to non-PII values such as route slugs and export formats.

export type AnalyticsEvent =
  | "contact_form_submit"
  | "calculator_used"
  | "cta_click"
  | "tool_export";

export type AnalyticsParams = Record<string, string | number>;

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

export function trackEvent(name: AnalyticsEvent, params?: AnalyticsParams): void {
  try {
    if (typeof window === "undefined") return;

    const gtag = window.gtag;
    if (typeof gtag !== "function") return;

    gtag("event", name, params ?? {});
  } catch {
    // Analytics must never break the page.
  }
}
