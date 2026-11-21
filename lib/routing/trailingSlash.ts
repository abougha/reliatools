// lib/routing/trailingSlash.ts
//
// The site is built with `trailingSlash: true`, so /tools is not canonical —
// /tools/ is. The Cloudflare assets binding's own `auto-trailing-slash`
// handling answers the slashless form with a 307, which Google treats as
// temporary and so keeps reporting both URL forms in Search Console. worker.ts
// applies this first so the redirect is a 301.

import { PAGE_NAMES } from "../seo/titles";

/**
 * Absolute URL to redirect to when `url` is the slashless form of a page
 * route, or null when it is already canonical or is not a page route — the
 * API, or a file such as /robots.txt or /_next/static/*.js.
 */
export function trailingSlashRedirect(url: URL): string | null {
  const { pathname } = url;

  if (pathname.endsWith("/")) return null;
  if (pathname.startsWith("/api/")) return null;

  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (lastSegment.includes(".")) return null;

  const target = new URL(url.toString());
  target.pathname = `${pathname}/`;
  return target.toString();
}

/** The one host every page is canonical on. */
export const CANONICAL_ORIGIN = "https://www.reliatools.com";
const CANONICAL_HOST = new URL(CANONICAL_ORIGIN).host;

/** Hosts that serve the site and should 301 to CANONICAL_ORIGIN. Anything else
 *  (localhost, *.workers.dev previews) is left alone. */
const SITE_HOSTS = new Set(["reliatools.com", CANONICAL_HOST]);

/** Lower-cased route → exact route, for the indexable pages in PAGE_NAMES. */
let routesByLowercase: Map<string, string> | null = null;
function exactCaseRoute(route: string): string | undefined {
  routesByLowercase ??= new Map(
    Object.keys(PAGE_NAMES).map((r) => [r.toLowerCase(), r]),
  );
  return routesByLowercase.get(route.toLowerCase());
}

/**
 * The single 301 target for any non-canonical form of a page URL, or null when
 * `url` is already canonical. Folds every fix into one hop so a crawler never
 * follows a redirect chain:
 *   - http:// or the bare apex reliatools.com → https://www.reliatools.com
 *   - /tools/weibull/ (wrong case) → /tools/Weibull/, for known page routes
 *   - /tools/Weibull → /tools/Weibull/ (see trailingSlashRedirect)
 * The query string is kept.
 */
export function canonicalRedirect(url: URL): string | null {
  const target = new URL(url.toString());

  if (SITE_HOSTS.has(url.hostname)) {
    target.protocol = "https:";
    target.host = CANONICAL_HOST;
  }

  const slashed = trailingSlashRedirect(target);
  if (slashed) target.pathname = new URL(slashed).pathname;

  const exact = exactCaseRoute(target.pathname);
  if (exact) target.pathname = exact;

  const out = target.toString();
  return out === url.toString() ? null : out;
}
