// lib/routing/trailingSlash.ts
//
// The site is built with `trailingSlash: true`, so /tools is not canonical —
// /tools/ is. The Cloudflare assets binding's own `auto-trailing-slash`
// handling answers the slashless form with a 307, which Google treats as
// temporary and so keeps reporting both URL forms in Search Console. worker.ts
// applies this first so the redirect is a 301.

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
