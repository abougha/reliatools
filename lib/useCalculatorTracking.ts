// lib/useCalculatorTracking.ts
"use client";

import { useCallback, useEffect, useRef } from "react";
import { trackEvent } from "./analytics";

/**
 * Fires a single `calculator_used` event per tool page visit.
 *
 * Most Reliatools calculators are reactive: they seed valid DEFAULTS and
 * already show a result on first paint, so "a result exists" would just
 * duplicate the pageview. Usage is therefore defined as the visitor
 * actually touching a form control on the page, followed by a quiet period,
 * so a typed value counts once rather than once per keystroke.
 *
 * The listener is delegated at the document and filtered to real form
 * controls. Tool pages are single-purpose, so any input/select/textarea a
 * visitor touches there belongs to the calculator. That keeps the signal
 * uniform across all tools — the reactive ones and the two that compute
 * behind a Calculate button — and keeps tracking entirely out of the
 * calculators' own code.
 *
 * @param tool  Route slug, matching app/tools/<slug> exactly, so the event
 *              joins cleanly to Search Console data. Pass an empty string on
 *              non-tool pages: the hook then attaches nothing and sends
 *              nothing. The fired-once guard resets when the slug changes,
 *              so client-side navigation between tools is counted per tool.
 * @returns     A manual trigger, for a page that would rather fire the event
 *              at an exact moment. Safe to call repeatedly; only the first
 *              call per tool sends an event.
 */
export function useCalculatorTracking(tool: string): () => void {
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [tool]);

  const markUsed = useCallback(() => {
    if (!tool) return;
    if (firedRef.current) return;
    firedRef.current = true;
    trackEvent("calculator_used", { tool });
  }, [tool]);

  useEffect(() => {
    if (!tool) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const handleInteraction = (event: Event) => {
      if (firedRef.current) return;

      const target = event.target;
      const isFormControl =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement;
      if (!isFormControl) return;

      // Debounce: a settled value counts once, not once per keystroke.
      if (timer) clearTimeout(timer);
      timer = setTimeout(markUsed, 1500);
    };

    document.addEventListener("input", handleInteraction, true);
    document.addEventListener("change", handleInteraction, true);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("input", handleInteraction, true);
      document.removeEventListener("change", handleInteraction, true);
    };
  }, [tool, markUsed]);

  return markUsed;
}

/**
 * Extracts the tool slug from a pathname, preserving its exact casing.
 * Returns "" for anything that is not a tool page.
 */
export function toolSlugFromPathname(pathname: string): string {
  const match = /^\/tools\/([^/]+)\/?$/.exec(pathname);
  return match ? match[1] : "";
}
