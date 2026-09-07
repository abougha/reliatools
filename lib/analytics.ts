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

import { pageTitle } from "@/lib/seo/titles";

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

// ---------------------------------------------------------------------------
// Pageviews
//
// GA4's automatic pageview reads `document.title` at send time. On a
// client-side route change that title is whatever Next.js has committed so
// far, and on a translated page it is whatever the browser rewrote it to — so
// one URL reported under several titles in GA4. We therefore turn the
// automatic pageview off (`send_page_view: false` in the gtag config in
// components/PublicSiteChrome.tsx) and send it here with `page_title` taken
// from lib/seo/titles.ts, the same map the route metadata renders from.
//
// `send_page_view: false` only covers the first load. GA4 enhanced measurement
// still sends its own pageview on each SPA route change and there is no page
// -side flag for it, so it has to be unticked in the GA4 admin (Admin > Data
// streams > Web > Enhanced measurement > Page views > advanced > "Page changes
// based on browser history events"). Verified with a scripted Chromium run:
// with it on, a client-side navigation produces two page_view hits.

// The gtag config runs in an afterInteractive script, which may not have
// executed by the time this module's first pageview fires. Wait for the flag
// that script sets rather than for `window.gtag`, so no event is ever sent
// ahead of the config call that gives it a measurement ID.
const READY_POLL_MS = 100;
const READY_MAX_ATTEMPTS = 100; // give up after ~10s (blocked, or GA never loads)

declare global {
  interface Window {
    __reliatoolsGaReady?: boolean;
  }
}

function whenGtagReady(run: (gtag: NonNullable<Window["gtag"]>) => void): void {
  let attempts = 0;

  const attempt = () => {
    const gtag = window.gtag;
    if (window.__reliatoolsGaReady && typeof gtag === "function") {
      run(gtag);
      return;
    }
    if (++attempts >= READY_MAX_ATTEMPTS) return;
    window.setTimeout(attempt, READY_POLL_MS);
  };

  attempt();
}

/**
 * Send a GA4 `page_view` for `pathname` with an explicit, canonical title.
 *
 * `gtag("set", ...)` is called first so that every later event on the page
 * (calculator_used, tool_export, ...) is attributed to the same title rather
 * than to whatever `document.title` happens to hold.
 */
export function trackPageView(pathname: string): void {
  try {
    if (typeof window === "undefined") return;

    const title = pageTitle(pathname);
    if (!title && process.env.NODE_ENV !== "production") {
      // A new route was added without a row in lib/seo/titles.ts.
      console.warn(`[analytics] no canonical title for "${pathname}"`);
    }

    const params = {
      page_title: title ?? document.title,
      page_location: window.location.href,
    };

    whenGtagReady((gtag) => {
      gtag("set", params);
      gtag("event", "page_view", params);
    });
  } catch {
    // Analytics must never break the page.
  }
}
