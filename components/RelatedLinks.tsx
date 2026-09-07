import Link from "next/link";

import { relatedTo } from "@/lib/seo/related";

/**
 * The "related" block that pairs an article with its calculator and back.
 *
 * Renders nothing when the route has no pair, so it is safe to drop onto any
 * page. Styling follows the callout already used near the end of the derating
 * article — a bordered card rather than an inline sentence, because the
 * existing in-prose links were not carrying readers across.
 */
export default function RelatedLinks({ route }: { route: string }) {
  const items = relatedTo(route);
  if (items.length === 0) return null;

  // A calculator page points at reading; an article points at calculators.
  const toTools = items.every((i) => i.href.startsWith("/tools/"));
  const heading = toTools
    ? items.length > 1
      ? "Related calculators"
      : "Related calculator"
    : "Related reading";

  return (
    <section aria-labelledby="related-links" className="mt-8 rounded-xl border bg-white p-5">
      <h2 id="related-links" className="text-sm font-semibold">
        {heading}
      </h2>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-blue-600 hover:underline">
              {item.label}
            </Link>
            <p className="mt-1 text-sm text-neutral-700">{item.blurb}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
