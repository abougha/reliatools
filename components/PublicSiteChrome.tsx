"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import SiteFooter from "./SiteFooter";
import AdUnit from "./AdUnit";
import CookieConsent from "./CookieConsent";
import {
  toolSlugFromPathname,
  useCalculatorTracking,
} from "@/lib/useCalculatorTracking";

// Consent Mode v2. Visitors in the EEA, UK and Switzerland start with cookies
// denied until they choose; a stored choice (components/CookieConsent.tsx,
// key "rt-consent") overrides the default everywhere. This must run before the
// Google Analytics and AdSense scripts below.
const CONSENT_AND_GTAG_INIT = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
    region: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']
  });
  try {
    var choice = window.localStorage.getItem('rt-consent');
    if (choice === 'granted' || choice === 'denied') {
      gtag('consent', 'update', {
        ad_storage: choice,
        ad_user_data: choice,
        ad_personalization: choice,
        analytics_storage: choice
      });
    }
  } catch (e) {}
  gtag('js', new Date());
  gtag('config', 'G-9TMY964ETQ');
`;

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

  // The home page places its own ad between sections.
  const isHome = pathname === "/";

  return (
    <>
      <Script id="gtag-init" strategy="afterInteractive">
        {CONSENT_AND_GTAG_INIT}
      </Script>
      <Script
        id="gtag-js"
        src="https://www.googletagmanager.com/gtag/js?id=G-9TMY964ETQ"
        strategy="afterInteractive"
      />
      <Script
        id="adsense-script"
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9300099645509490"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <Navbar />
      {children}
      {!isHome && <AdUnit key={pathname} className="mt-12" />}
      <SiteFooter />
      <CookieConsent />
    </>
  );
}
