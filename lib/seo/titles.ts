// lib/seo/titles.ts
//
// Single canonical source for every indexable page title on the site.
//
// Two consumers read this file and they must never disagree:
//   1. `metadata.title` (`app/**/layout.tsx`, `app/**/page.tsx`) — the <title>.
//   2. `metadata.openGraph.title`, via `ogTitle()` — the share-card title.
//
// Why it exists: `app/tools/layout.tsx` and `app/resources/layout.tsx` each
// set `title` as a plain string, which in Next.js nulls `title.template` for
// the whole subtree. The root "%s | Reliatools" template therefore never
// reached any tool or article page, and each one hardcoded the suffix — so a
// new page under either root shipped bare. Commit cb8ec53 (2026-08-16) fixed
// the 13 pages that had already shipped that way; this map fixes the cause.
//
// PAGE_NAMES holds the *bare* page name. The " | Reliatools" suffix is added
// exactly once, by the Next.js `title.template` for rendered metadata or by
// `pageTitleFor()` / `ogTitle()` — never hardcoded into a name here.

export const SITE_NAME = "Reliatools";

/** Next.js `metadata.title.template` value. Declared by any layout that also
 *  sets a plain-string title, because a plain-string title in a nested layout
 *  clears the parent template for that whole subtree. */
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

/**
 * Bare page names keyed by route path (always trailing-slash — the site runs
 * with `trailingSlash: true`). Adding a page means adding a row here.
 */
export const PAGE_NAMES = {
  "/about/": "About",
  "/contact/": "Contact Reliatools",
  "/resources/": "Reliability Engineering Resources",
  "/resources/arrhenius-article/": "Arrhenius Model in Reliability Engineering — Thermal Acceleration Explained",
  "/resources/derating/": "Component Derating in Electronics — Reliability by Design",
  "/resources/fit-article/": "What Does 1 FIT Really Mean? Automotive Reliability, PMHF & ASIL Explained",
  "/resources/halt/": "HALT Testing — Highly Accelerated Life Testing Guide",
  "/resources/mission-profile-builder/": "Stop Guessing Environmental Loads — Start Designing from a Real Mission Profile",
  "/resources/nudd-engineering-risk/": "NUDD Risk Assessment: New, Unique, Different, Difficult",
  "/resources/softwarebrp-article/": "Software Reliability Program (BRP) — Planning Guide",
  "/resources/taguchi-bayesian-article/": "Hybrid Test Planning: Taguchi, Bayesian, and Monte Carlo",
  "/resources/thermal-shock-article/": "Thermal Shock, Thermal Cycling, and the Coffin-Manson Model",
  "/tools/": "Reliability Engineering Tools",
  "/tools/Arrhenius/": "Arrhenius Acceleration Factor Calculator (Free Online Tool)",
  "/tools/BurnInWizard/": "Burn-In Test Calculator & Planning Wizard",
  "/tools/CoffinManson/": "Coffin-Manson Thermal Fatigue Calculator — Cycles to Failure",
  "/tools/Derating/": "Component Derating Calculator & Navigator (MIL-Style)",
  "/tools/Electromigration/": "Electromigration MTTF Calculator (Black's Equation)",
  "/tools/FIT/": "FIT Calculator — Reliability, ppm, and Test Evidence",
  "/tools/HALTHASSWizard/": "HALT/HASS Test Plan Builder — Step-Stress Profiles",
  "/tools/MissionProfile/": "Mission Profile & Duty Cycle Builder for Reliability Testing",
  "/tools/NUDD/": "NUDD Assessment — New, Unique, Different, Difficult",
  "/tools/Psychrometrics/": "Psychrometric Calculator — Humidity, Wet Bulb, Enthalpy",
  "/tools/Samplesize/": "Reliability Sample Size Calculator",
  "/tools/SoftwareBRP/": "Software Reliability Calculator — Bayesian Prediction",
  "/tools/VibrationWizard/": "Vibration Test PSD Calculator & Profile Builder (GRMS)",
  "/tools/Weibull/": "Weibull Analysis Calculator — Probability Plot, Beta & Eta",
  "/tools/p-diagram/": "P-Diagram Generator for Robust Design",
  "/tools/rbd/": "Reliability Block Diagram (RBD) Calculator",
  "/tools/testplangenerator/": "Reliability Test Plan Generator — Mission Profile to DVP&R",
} as const;

export type KnownRoute = keyof typeof PAGE_NAMES;

/**
 * Routes whose title is deliberately not "<name> | Reliatools".
 * The home page leads with the brand instead of trailing it; rewriting it
 * would change the title of the site's top-ranking page.
 */
export const ABSOLUTE_TITLES: Record<string, string> = {
  "/": "Reliatools | Physics-Based Reliability Engineering Tools",
};

/** Normalize a pathname to the trailing-slash form used as the map key. */
export function normalizeRoute(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/)[0] || "/";
  if (withoutQuery === "") return "/";
  return withoutQuery.endsWith("/") ? withoutQuery : `${withoutQuery}/`;
}

/**
 * Full page title for any pathname, suffix included. Returns null for routes
 * that are not in the map (the /app workspace, 404s), so the caller can decide
 * on a fallback. Use `pageTitleFor()` when the route is known at build time.
 */
export function pageTitle(pathname: string): string | null {
  const route = normalizeRoute(pathname);

  const absolute = ABSOLUTE_TITLES[route];
  if (absolute) return absolute;

  const name = (PAGE_NAMES as Record<string, string>)[route];
  if (!name) return null;

  return `${name} | ${SITE_NAME}`;
}

/**
 * Full page title for a route known at build time — suffix included, never
 * null. Use this for openGraph titles and anywhere a complete title string is
 * needed; use the bare `PAGE_NAMES` entry for `metadata.title`, where the
 * Next.js template appends the suffix.
 */
export function pageTitleFor(route: KnownRoute): string {
  return `${PAGE_NAMES[route]} | ${SITE_NAME}`;
}

/**
 * Routes whose openGraph title deliberately differs from the page title.
 *
 * Social cards truncate around 60-70 characters, so two long article titles
 * ship a shortened form, and the two brand-led names would otherwise read
 * "Contact Reliatools | Reliatools". These are the only intentional
 * divergences; every other route shares one string with its <title>, so a
 * rewrite of a page name carries to the share card automatically.
 */
export const OG_TITLES: Record<string, string> = {
  "/about/": "About Reliatools",
  "/contact/": "Contact Reliatools",
  "/resources/arrhenius-article/":
    `Arrhenius Model in Reliability Engineering | ${SITE_NAME}`,
  "/resources/fit-article/":
    `What Does 1 FIT Really Mean? PMHF & ASIL Explained | ${SITE_NAME}`,
  "/tools/Electromigration/":
    `Electromigration MTTF Calculator — Black's Equation | ${SITE_NAME}`,
};

/**
 * openGraph title for a route: the page title unless the route is listed in
 * `OG_TITLES`. Takes the home page as well as the mapped routes, since `/`
 * carries an absolute title rather than a `PAGE_NAMES` entry.
 */
export function ogTitle(route: KnownRoute | "/"): string {
  return OG_TITLES[route] ?? pageTitle(route) ?? SITE_NAME;
}
