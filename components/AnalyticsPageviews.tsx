"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { trackPageView } from "@/lib/analytics";

/**
 * Sends one GA4 `page_view` per route, with an explicit canonical title.
 *
 * Mounted once by PublicSiteChrome. GA4's own pageview is disabled
 * (`send_page_view: false`) because it reads `document.title` at send time,
 * which on a client-side navigation is whichever title Next.js has committed
 * so far. See lib/analytics.ts.
 */
export default function AnalyticsPageviews() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // Guards React StrictMode's double effect in dev, and a re-render that
    // does not actually change the route.
    if (lastSent.current === pathname) return;

    lastSent.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
