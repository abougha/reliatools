// lib/seo/related.ts
//
// Article <-> calculator pairs, for the "related" block on both page types.
//
// The problem this solves: GA4 shows articles bouncing at 80-100% while the
// tools index bounces at 9.7%. The article bodies already link to their
// calculator mid-prose, but no calculator linked back, so a reader arriving on
// a tool page from search had nowhere to go. Pairs are declared once here and
// resolved in both directions, so a pair can never be half-wired.
//
// Every href is trailing-slash: the site runs `trailingSlash: true`, and
// worker.ts now 301s the slashless form, so a slashless link costs a redirect
// hop on hard navigation.
//
// Labels and blurbs restate copy that already exists in data/tools.json and
// data/resources.json — no new technical claims. Adding a pair means adding
// one row to ITEMS for each side plus one row to PAIRS.

export type RelatedItem = {
  /** Canonical route, trailing slash included. */
  href: string;
  /** Short name for the card — the tool/article name, not the full <title>. */
  label: string;
  /** One line on what the reader gets by following it. */
  blurb: string;
};

const ITEMS: Record<string, RelatedItem> = {
  "/tools/FIT/": {
    href: "/tools/FIT/",
    label: "FIT Calculator",
    blurb:
      "Convert a FIT number into mission ppm, fleet failures and MTTF, and check whether the test evidence supports it.",
  },
  "/resources/fit-article/": {
    href: "/resources/fit-article/",
    label: "What Does 1 FIT Really Mean?",
    blurb:
      "Mission ppm, expected fleet failures, PMHF and ASIL targets, and the test evidence a FIT claim needs.",
  },

  "/tools/Arrhenius/": {
    href: "/tools/Arrhenius/",
    label: "Arrhenius Calculator",
    blurb:
      "Acceleration factors, equivalent life and test durations for temperature-driven aging.",
  },
  "/resources/arrhenius-article/": {
    href: "/resources/arrhenius-article/",
    label: "Understanding Arrhenius for Reliability",
    blurb:
      "Thermal aging models and how they apply in reliability engineering, including activation-energy guidance.",
  },

  "/tools/CoffinManson/": {
    href: "/tools/CoffinManson/",
    label: "Coffin-Manson Calculator",
    blurb:
      "Estimate fatigue life from thermal cycling for solder joints, interconnects and constrained assemblies.",
  },
  "/resources/thermal-shock-article/": {
    href: "/resources/thermal-shock-article/",
    label: "Thermal Shock & Coffin-Manson in Microelectronics",
    blurb:
      "How thermal cycling drives solder-joint fatigue, and where the Coffin-Manson model fits.",
  },

  "/tools/Derating/": {
    href: "/tools/Derating/",
    label: "Derating Navigator",
    blurb:
      "Apply MIL-style derating rules and quantify derated margin, factor of safety and thermal headroom.",
  },
  "/resources/derating/": {
    href: "/resources/derating/",
    label: "A Technical Guide to Component Derating",
    blurb:
      "Thermal and electrical stress models, design margin, and why derating matters in high-power systems.",
  },
};

/** Each pair is [article route, calculator route]. Resolved both ways below. */
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["/resources/fit-article/", "/tools/FIT/"],
  ["/resources/arrhenius-article/", "/tools/Arrhenius/"],
  ["/resources/thermal-shock-article/", "/tools/CoffinManson/"],
  ["/resources/derating/", "/tools/Derating/"],
];

const GRAPH: Record<string, string[]> = {};
for (const [article, tool] of PAIRS) {
  (GRAPH[article] ??= []).push(tool);
  (GRAPH[tool] ??= []).push(article);
}

/** Normalize to the trailing-slash key form, so a caller may pass either. */
function key(route: string): string {
  const path = route.split(/[?#]/)[0] || "/";
  return path.endsWith("/") ? path : `${path}/`;
}

/**
 * The pages `route` should link to. Empty for any route without a pair, which
 * is how a page opts out — the component renders nothing.
 */
export function relatedTo(route: string): RelatedItem[] {
  return (GRAPH[key(route)] ?? []).map((r) => ITEMS[r]).filter(Boolean);
}

/** Every route that has a related block. Used by the tests. */
export function pairedRoutes(): string[] {
  return Object.keys(GRAPH).sort();
}

export { ITEMS as RELATED_ITEMS, PAIRS as RELATED_PAIRS };
