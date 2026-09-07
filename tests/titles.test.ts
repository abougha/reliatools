import { describe, expect, it } from "vitest";

import {
  ABSOLUTE_TITLES,
  OG_TITLES,
  PAGE_NAMES,
  SITE_NAME,
  normalizeRoute,
  ogTitle,
  pageTitle,
  pageTitleFor,
} from "../lib/seo/titles";
import { trailingSlashRedirect } from "../lib/routing/trailingSlash";

const SUFFIX = ` | ${SITE_NAME}`;

describe("page title registry", () => {
  it("stores bare names, so the suffix is never applied twice", () => {
    for (const [route, name] of Object.entries(PAGE_NAMES)) {
      expect(name, route).not.toContain(SUFFIX);
      expect(name.trim(), route).toBe(name);
      expect(name, route).not.toBe("");
    }
  });

  it("keys every route in the trailing-slash form the site serves", () => {
    for (const route of Object.keys(PAGE_NAMES)) {
      expect(route.startsWith("/"), route).toBe(true);
      expect(route.endsWith("/"), route).toBe(true);
    }
  });

  it("resolves every known route to exactly one suffixed title", () => {
    for (const route of Object.keys(PAGE_NAMES)) {
      const title = pageTitle(route);
      expect(title, route).toBe(`${PAGE_NAMES[route as keyof typeof PAGE_NAMES]}${SUFFIX}`);
      expect(title!.split(SUFFIX).length - 1, route).toBe(1);
    }
  });

  it("resolves the slashless form of a route to the same title", () => {
    expect(pageTitle("/tools/Derating")).toBe(pageTitle("/tools/Derating/"));
    expect(pageTitle("/tools/Arrhenius?ref=x")).toBe(pageTitle("/tools/Arrhenius/"));
  });

  it("carries the brand on the home page too", () => {
    expect(pageTitle("/")).toBe(ABSOLUTE_TITLES["/"]);
    expect(pageTitle("/")).toContain(SITE_NAME);
  });

  it("returns null for routes with no canonical title", () => {
    expect(pageTitle("/app/projects/")).toBeNull();
    expect(pageTitle("/does-not-exist/")).toBeNull();
  });

  it("pageTitleFor matches pageTitle for known routes", () => {
    expect(pageTitleFor("/tools/Samplesize/")).toBe(pageTitle("/tools/Samplesize/"));
  });

  it("normalizes pathnames", () => {
    expect(normalizeRoute("/tools")).toBe("/tools/");
    expect(normalizeRoute("/tools/")).toBe("/tools/");
    expect(normalizeRoute("/")).toBe("/");
    expect(normalizeRoute("/tools/FIT/#results")).toBe("/tools/FIT/");
  });
});

describe("trailingSlashRedirect", () => {
  const at = (href: string) => trailingSlashRedirect(new URL(href));

  it("redirects slashless page routes", () => {
    expect(at("https://www.reliatools.com/tools")).toBe("https://www.reliatools.com/tools/");
    expect(at("https://www.reliatools.com/resources/halt")).toBe(
      "https://www.reliatools.com/resources/halt/",
    );
  });

  it("preserves the query string", () => {
    expect(at("https://www.reliatools.com/about?utm_source=x")).toBe(
      "https://www.reliatools.com/about/?utm_source=x",
    );
  });

  it("leaves canonical URLs, files, and the API alone", () => {
    expect(at("https://www.reliatools.com/")).toBeNull();
    expect(at("https://www.reliatools.com/tools/Arrhenius/")).toBeNull();
    expect(at("https://www.reliatools.com/robots.txt")).toBeNull();
    expect(at("https://www.reliatools.com/sitemap-0.xml")).toBeNull();
    expect(at("https://www.reliatools.com/_next/static/chunks/main.js")).toBeNull();
    expect(at("https://www.reliatools.com/api/contact")).toBeNull();
  });
});

describe("openGraph titles", () => {
  it("falls back to the page title for every unlisted route", () => {
    for (const route of Object.keys(PAGE_NAMES)) {
      if (route in OG_TITLES) continue;
      expect(ogTitle(route as keyof typeof PAGE_NAMES), route).toBe(
        pageTitleFor(route as keyof typeof PAGE_NAMES),
      );
    }
  });

  it("resolves the home page, which has no PAGE_NAMES entry", () => {
    expect(ogTitle("/")).toBe(ABSOLUTE_TITLES["/"]);
  });

  it("overrides only routes the site actually serves", () => {
    for (const route of Object.keys(OG_TITLES)) {
      expect(route in PAGE_NAMES || route in ABSOLUTE_TITLES, route).toBe(true);
    }
  });

  it("keeps the two brand-led names from doubling the suffix", () => {
    expect(ogTitle("/about/")).toBe("About Reliatools");
    expect(ogTitle("/contact/")).toBe("Contact Reliatools");
  });
});
