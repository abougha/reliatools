"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function PublicSiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
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
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-9TMY964ETQ');
      `}</Script>
      {children}
      <footer className="mt-10 border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        &copy; 2025 Reliatools. All rights reserved. The tools and content on this site
        are provided "as is" without warranties of any kind. Reliatools assumes
        no liability for the accuracy or use of results. Use at your own risk.
      </footer>
    </>
  );
}
