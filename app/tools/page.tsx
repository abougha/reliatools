// app/tools/page.tsx
//
// Tools index. Server component: the intro, the "how to choose" prose and the
// ItemList JSON-LD ship as static HTML. Grouping comes from lib/toolGroups.ts
// (shared with the navbar and home page) so the three never drift; card copy
// comes from data/tools.json. Search and filtering live in ToolsBrowser.

import Link from "next/link";
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

/** Static guidance per workflow stage, linking tools to companion articles. */
const GUIDE: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Define the use conditions",
    body: (
      <>
        Start with the environment the product will actually see. The{" "}
        <Link href="/tools/MissionProfile/">Mission Profile Builder</Link> captures duty cycle and
        stress by lifecycle phase (background:{" "}
        <Link href="/resources/mission-profile-builder/">Stop Guessing Environmental Loads</Link>).
        Use the <Link href="/tools/NUDD/">NUDD Assessment</Link> to find where a design is new or
        risky (<Link href="/resources/nudd-engineering-risk/">why NUDD works</Link>), the{" "}
        <Link href="/tools/p-diagram/">P-Diagram Generator</Link> to map signals and noise factors,
        the <Link href="/tools/Derating/">Derating Navigator</Link> to check component stress
        margins (<Link href="/resources/derating/">derating guide</Link>), and the{" "}
        <Link href="/tools/rbd/">RBD Generator</Link> to model system architecture.
      </>
    ),
  },
  {
    title: "2. Model how stress accelerates failure",
    body: (
      <>
        Physics-of-failure models convert field conditions into test conditions. Use the{" "}
        <Link href="/tools/Arrhenius/">Arrhenius Calculator</Link> for temperature-driven aging (
        <Link href="/resources/arrhenius-article/">Understanding Arrhenius</Link>), the{" "}
        <Link href="/tools/CoffinManson/">Coffin-Manson Calculator</Link> for thermal-cycling fatigue
        (<Link href="/resources/thermal-shock-article/">thermal shock and Coffin-Manson</Link>), the{" "}
        <Link href="/tools/Electromigration/">Electromigration Calculator</Link> for interconnect
        wear-out, and the <Link href="/tools/Psychrometrics/">Psychrometric Calculator</Link> for
        humidity conditions.
      </>
    ),
  },
  {
    title: "3. Plan the validation",
    body: (
      <>
        Turn reliability targets into a test plan with the{" "}
        <Link href="/tools/testplangenerator/">Test Plan Generator</Link> (see also{" "}
        <Link href="/resources/taguchi-bayesian-article/">hybrid test planning</Link>), then size it
        with the <Link href="/tools/Samplesize/">Sample Size Calculator</Link>. For margin discovery
        and production screening, use the{" "}
        <Link href="/tools/HALTHASSWizard/">HALT/HASS Planning Wizard</Link> (
        <Link href="/resources/halt/">HALT explained</Link>), the{" "}
        <Link href="/tools/BurnInWizard/">Burn-In Test Wizard</Link> and the{" "}
        <Link href="/tools/VibrationWizard/">Vibration + Thermal Cycling Wizard</Link>.
      </>
    ),
  },
  {
    title: "4. Analyze results and predict life",
    body: (
      <>
        Fit failure and suspension data with the{" "}
        <Link href="/tools/Weibull/">Weibull Probability Plot</Link>, translate failure rates with
        the <Link href="/tools/FIT/">FIT Calculator</Link> (
        <Link href="/resources/fit-article/">What does 1 FIT really mean?</Link>), and estimate
        software release readiness with the{" "}
        <Link href="/tools/SoftwareBRP/">Bayesian Reliability Predictor</Link> (
        <Link href="/resources/softwarebrp-article/">how it works</Link>).
      </>
    ),
  },
];

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

      <section
        className="mt-14 border-t border-slate-200 pt-10"
        aria-labelledby="choose-heading"
      >
        <h2 id="choose-heading" className="text-xl font-semibold text-slate-900">
          How to choose the right reliability tool
        </h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          The tools follow the order of a typical reliability program, from understanding the use
          environment to demonstrating life with test data. Pick the stage you are in:
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {GUIDE.map((g) => (
            <div key={g.title}>
              <h3 className="font-semibold text-slate-900">{g.title}</h3>
              <p className="mt-1 leading-relaxed text-slate-600 [&_a]:font-medium [&_a]:text-blue-600 [&_a:hover]:text-blue-700 [&_a:hover]:underline">
                {g.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
