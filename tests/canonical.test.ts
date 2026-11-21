// One URL per page: https://www.reliatools.com/<route>/ in exact case.
// The worker 301s every other form, so any canonical tag, og:url, JSON-LD url
// or internal link that names another form points Google at a redirect.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { canonicalRedirect } from "../lib/routing/trailingSlash";
import { pageUrl } from "../lib/seo/jsonld";

const ROOT = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|json)$/.test(name) ? [path] : [];
  });
}

// The /app workspace is not indexed (robots.txt disallows it).
const PUBLIC_SOURCES = ["app", "components", "lib", "data"]
  .flatMap((d) => sourceFiles(join(ROOT, d)))
  .filter((p) => !p.includes(`${join(ROOT, "app", "app")}`) && !p.includes("appWorkspace"));

describe("canonicalRedirect", () => {
  const at = (href: string) => canonicalRedirect(new URL(href));

  it("leaves canonical URLs and files alone", () => {
    expect(at("https://www.reliatools.com/")).toBeNull();
    expect(at("https://www.reliatools.com/tools/Weibull/")).toBeNull();
    expect(at("https://www.reliatools.com/tools/Weibull/?x=1")).toBeNull();
    expect(at("https://www.reliatools.com/robots.txt")).toBeNull();
    expect(at("https://www.reliatools.com/api/contact")).toBeNull();
  });

  it("adds the trailing slash", () => {
    expect(at("https://www.reliatools.com/tools/Weibull")).toBe(
      "https://www.reliatools.com/tools/Weibull/",
    );
  });

  it("fixes the case of known routes", () => {
    expect(at("https://www.reliatools.com/tools/weibull/")).toBe(
      "https://www.reliatools.com/tools/Weibull/",
    );
    expect(at("https://www.reliatools.com/TOOLS/samplesize?q=1")).toBe(
      "https://www.reliatools.com/tools/Samplesize/?q=1",
    );
  });

  it("leaves the case of unknown paths alone", () => {
    expect(at("https://www.reliatools.com/Unknown/")).toBeNull();
  });

  it("sends http and the bare apex to https://www, in one hop", () => {
    expect(at("http://www.reliatools.com/tools/")).toBe("https://www.reliatools.com/tools/");
    expect(at("https://reliatools.com/")).toBe("https://www.reliatools.com/");
    expect(at("http://reliatools.com/tools/weibull")).toBe(
      "https://www.reliatools.com/tools/Weibull/",
    );
  });

  it("ignores other hosts, such as local dev and workers.dev previews", () => {
    expect(at("http://localhost:8787/tools/")).toBeNull();
    expect(at("https://reliatools.example.workers.dev/tools/")).toBeNull();
  });
});

describe("canonical URLs in source", () => {
  it("every canonical tag and og:url ends with a slash", () => {
    const bad: string[] = [];
    for (const file of PUBLIC_SOURCES) {
      const re = /(?:url|canonical):\s*"(https:\/\/www\.reliatools\.com[^"]*)"/g;
      for (const [, href] of readFileSync(file, "utf8").matchAll(re)) {
        if (!href.endsWith("/")) bad.push(`${file.slice(ROOT.length)}: ${href}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every internal page link ends with a slash", () => {
    const bad: string[] = [];
    const re = /(?:href=|href:\s*|"route":\s*|"link":\s*)"(\/[^"#?]*)"/g;
    for (const file of PUBLIC_SOURCES) {
      for (const [, href] of readFileSync(file, "utf8").matchAll(re)) {
        if (href.endsWith("/") || /\.[a-z0-9]+$/i.test(href)) continue;
        bad.push(`${file.slice(ROOT.length)}: ${href}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("JSON-LD page URLs use the slash form", () => {
    expect(pageUrl("/tools/FIT")).toBe("https://www.reliatools.com/tools/FIT/");
    expect(pageUrl("/tools/FIT/")).toBe("https://www.reliatools.com/tools/FIT/");
  });

  it("the sitemap uses the slash form", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require("../next-sitemap.config.js");
    expect(config.trailingSlash).toBe(true);
  });
});
