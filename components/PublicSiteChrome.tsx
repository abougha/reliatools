"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import AnalyticsPageviews from "./AnalyticsPageviews";
import {
  toolSlugFromPathname,
  useCalculatorTracking,
} from "@/lib/useCalculatorTracking";

export default function PublicSiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Mounted once for the whole site: the hook is document-delegated, so every
  // calculator under /tools/<slug> is covered without any tracking code
  // reaching the tool pages themselves. A no-op everywhere else.
  useCalculatorTracking(toolSlugFromPathname(pathname));

  const isAppWorkspace = pathname === "/app" || pathname.startsWith("/app/");

  if (isAppWorkspace) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <Script
        id="adsense-script"
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9300099645509490"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <Script
        id="gtag-js"
        src="https://www.googletagmanager.com/gtag/js?id=G-9TMY964ETQ"
        strategy="afterInteractive"
      />
      {/* send_page_view is off on purpose: the automatic pageview reads
          document.title at send time, which on a client-side navigation is
          whatever title Next.js has committed so far. AnalyticsPageviews
          sends it instead, with an explicit title from lib/seo/titles.ts.

          REQUIRED GA4 ADMIN SETTING: this flag only suppresses the pageview on
          first load. Enhanced measurement sends a second one on every SPA route
          change, and that one cannot be turned off from the page. Turn it off
          at Admin > Data streams > Web > Enhanced measurement > Page views >
          Show advanced settings > untick "Page changes based on browser history
          events". Leaving it on double-counts every client-side navigation. */}
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-9TMY964ETQ', { send_page_view: false });
        window.__reliatoolsGaReady = true;
      `}</Script>
      <AnalyticsPageviews />
      {children}
      <footer className="mt-10 border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Reliatools. All rights reserved. The tools and content on this site
        are provided "as is" without warranties of any kind. Reliatools assumes
        no liability for the accuracy or use of results. Use at your own risk.
      </footer>
    </>
  );
}
