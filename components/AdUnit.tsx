"use client";

import { useEffect } from "react";

/**
 * One in-content AdSense unit. Rendered at its natural size and never
 * clipped or made sticky — AdSense policy forbids obscuring an ad.
 */
export default function AdUnit({ className = "" }: { className?: string }) {
  useEffect(() => {
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // The ad script is blocked or not ready; the page works without it.
    }
  }, []);

  return (
    <aside aria-label="Advertisement" className={`mx-auto w-full max-w-4xl px-6 ${className}`}>
      <p className="mb-1 text-center text-xs text-slate-500">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: 90 }}
        data-ad-client="ca-pub-9300099645509490"
        data-ad-slot="2792740719"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
