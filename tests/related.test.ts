import { describe, expect, it } from "vitest";

import {
  RELATED_ITEMS,
  RELATED_PAIRS,
  pairedRoutes,
  relatedTo,
} from "../lib/seo/related";
import { PAGE_NAMES } from "../lib/seo/titles";

describe("related links", () => {
  it("pairs every route in both directions", () => {
    for (const [article, tool] of RELATED_PAIRS) {
      expect(relatedTo(article).map((i) => i.href), article).toContain(tool);
      expect(relatedTo(tool).map((i) => i.href), tool).toContain(article);
    }
  });

  it("points only at routes the site actually serves", () => {
    for (const route of pairedRoutes()) {
      expect(route in PAGE_NAMES, route).toBe(true);
    }
    for (const item of Object.values(RELATED_ITEMS)) {
      expect(item.href in PAGE_NAMES, item.href).toBe(true);
    }
  });

  it("uses the canonical trailing-slash form, so no link costs a redirect", () => {
    for (const item of Object.values(RELATED_ITEMS)) {
      expect(item.href.endsWith("/"), item.href).toBe(true);
      expect(item.href.startsWith("/"), item.href).toBe(true);
    }
  });

  it("gives every item a label and a blurb", () => {
    for (const [route, item] of Object.entries(RELATED_ITEMS)) {
      expect(item.href, route).toBe(route);
      expect(item.label.trim(), route).not.toBe("");
      expect(item.blurb.trim(), route).not.toBe("");
    }
  });

  it("returns nothing for an unpaired route, so the block is opt-in", () => {
    expect(relatedTo("/tools/Weibull/")).toEqual([]);
    expect(relatedTo("/about/")).toEqual([]);
  });

  it("accepts the slashless form a caller might pass", () => {
    expect(relatedTo("/tools/FIT")).toEqual(relatedTo("/tools/FIT/"));
  });
});
