// app/tools/page.tsx
//
// Tools index. Server component: the intro, the card list and the ItemList
// JSON-LD ship as static HTML. Grouping comes from lib/toolGroups.ts
// (shared with the navbar and home page) so the three never drift; card copy
// comes from data/tools.json. Search and filtering live in ToolsBrowser.

import JsonLd from "@/components/JsonLd";
import toolsData from "@/data/tools.json";
import { TOOL_GROUPS } from "@/lib/toolGroups";
import ToolsBrowser, { type BrowserGroup, type BrowserTool } from "./ToolsBrowser";

interface Tool {
  id: string;
  title: string;
  route: string;
  description: string;
  whenToUse?: string;
}

const SITE = "https://www.reliatools.com";

/** Badge text per tool id. */
const TOOL_KIND: Record<string, string> = {
  "test-plan": "Generator",
  "mission-profile-builder": "Builder",
  "halt-hass": "Wizard",
  burnin: "Wizard",
  "vibration-wizard": "Wizard",
  derating: "Calculator",
  arrhenius: "Calculator",
  weibull: "Analysis",
  "coffin-manson": "Calculator",
  electromigration: "Calculator",
  Samplesize: "Calculator",
  Psychrometric: "Calculator",
  "p-diagram": "Generator",
  "rbd-generator": "Generator",
  "bayesian-prediction": "Analysis",
  "fit-calculator": "Calculator",
  "nudd-assessment": "Assessment",
};

/** Flagship workflows shown in the "Start here" row. */
const FEATURED_IDS = ["test-plan", "weibull", "arrhenius"];

/** The site runs trailingSlash: true and the worker 301s slashless paths. */
const withSlash = (href: string) => (href.endsWith("/") ? href : `${href}/`);
const normalize = (href: string) => withSlash(href).toLowerCase();

function buildData() {
  const tools = toolsData as Tool[];
  const byRoute = new Map(tools.map((t) => [normalize(t.route), t]));

  const toBrowserTool = (t: Tool): BrowserTool => ({
    id: t.id,
    title: t.title,
    href: withSlash(t.route),
    description: t.description,
    whenToUse: t.whenToUse,
    kind: TOOL_KIND[t.id] ?? "Tool",
  });

  const placed = new Set<string>();
  const groups: BrowserGroup[] = TOOL_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    blurb: g.blurb,
    tools: g.tools.flatMap((link) => {
      const t = byRoute.get(normalize(link.href));
      if (!t) return [];
      placed.add(t.id);
      return [toBrowserTool(t)];
    }),
  }));

  // Anything in tools.json but missing from TOOL_GROUPS still gets listed.
  const orphans = tools.filter((t) => !placed.has(t.id));
  if (orphans.length > 0) {
    groups.push({
      id: "other",
      title: "More Tools",
      blurb: "Other calculators and generators.",
      tools: orphans.map(toBrowserTool),
    });
  }

  const featured = FEATURED_IDS.map((id) => tools.find((t) => t.id === id))
    .filter((t): t is Tool => Boolean(t))
    .map(toBrowserTool);

  return { groups, featured };
}

export default function ToolsPage() {
  const { groups, featured } = buildData();
  const allTools = groups.flatMap((g) => g.tools);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Reliability engineering tools",
    numberOfItems: allTools.length,
    itemListElement: allTools.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.title,
      url: `${SITE}${t.href}`,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd data={itemList} />

      <header className="mb-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          {allTools.length} free tools
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Reliability Engineering Tools</h1>
        <p className="mt-2 text-slate-600">
          Free, physics-based calculators for every stage of reliability work: define use
          conditions, model acceleration, plan validation tests and analyze life data. No sign-up
          required.
        </p>
      </header>

      <ToolsBrowser groups={groups} featured={featured} />
    </div>
  );
}
