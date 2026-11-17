"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Public site key (safe to ship in the page). The matching secret lives only
// in the Worker as TURNSTILE_SECRET_KEY and is checked in worker.ts.
export const TURNSTILE_SITE_KEY = "0x4AAAAAAGEODrsPQ9twSPqg";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile challenge. Reports a token through `onToken` (null when
 * it expires or fails). Change `resetKey` to request a fresh token — a token
 * can only be verified once.
 */
export default function TurnstileWidget({
  onToken,
  resetKey,
}: {
  onToken: (token: string | null) => void;
  resetKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.turnstile) setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.turnstile) return;
    const api = window.turnstile;
    const id = api.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });
    widgetIdRef.current = id;
    return () => {
      widgetIdRef.current = null;
      try {
        api.remove(id);
      } catch {
        // Widget already gone.
      }
    };
  }, [ready]);

  useEffect(() => {
    if (resetKey === 0 || !widgetIdRef.current) return;
    window.turnstile?.reset(widgetIdRef.current);
  }, [resetKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
    </>
  );
}
