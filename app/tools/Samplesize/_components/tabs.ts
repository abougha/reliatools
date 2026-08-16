// Tab and method registry. Shared so the page can resolve a URL hash straight to
// a method (e.g. #mtbf) without either side hard-coding the other's ids.

export const PROVE_METHODS = [
  { id: "success-run", label: "Success run / failures allowed" },
  { id: "extended-bogey", label: "Extended bogey" },
  { id: "mtbf", label: "MTBF demonstration" },
] as const;

export const CHARACTERISE_METHODS = [
  { id: "weibull-life", label: "Weibull life test" },
  { id: "alt", label: "ALT / QALT" },
  { id: "degradation", label: "Degradation" },
] as const;

export const MARGIN_METHODS = [
  { id: "tolerance-interval", label: "Tolerance interval" },
  { id: "comparative", label: "Comparative test (A vs B)" },
  { id: "weibayes", label: "Weibayes / prior-informed" },
] as const;

export type ProveMethodId = (typeof PROVE_METHODS)[number]["id"];
export type CharacteriseMethodId = (typeof CHARACTERISE_METHODS)[number]["id"];
export type MarginMethodId = (typeof MARGIN_METHODS)[number]["id"];

export const TABS = [
  {
    id: "prove",
    label: "Prove a claim",
    heading: "Prove a reliability claim",
    qualifier: "test-to-pass",
    blurb: "You already know the target. The question is how much test it takes to defend it.",
    methodIds: PROVE_METHODS.map((method) => method.id) as string[],
  },
  {
    id: "characterise",
    label: "Characterise life",
    heading: "Characterise the life distribution",
    qualifier: "test-to-failure",
    blurb: "You want to learn the shape of the failure distribution, not pass a gate.",
    methodIds: CHARACTERISE_METHODS.map((method) => method.id) as string[],
  },
  {
    id: "margin",
    label: "Measure margin",
    heading: "Measure margin instead of counting failures",
    qualifier: "variables data",
    blurb: "Measuring how much room you have is far cheaper than counting pass/fail outcomes.",
    methodIds: MARGIN_METHODS.map((method) => method.id) as string[],
  },
  {
    id: "halt",
    label: "HALT budget",
    heading: "HALT unit budget",
    qualifier: "discovery, not proof",
    blurb: "How many units to hand over to a HALT, knowing you will destroy them.",
    methodIds: [],
  },
  {
    id: "hass",
    label: "HASS screen",
    heading: "HASS screen sizing",
    qualifier: "production screening",
    blurb: "How much of each production lot to screen, and how hard.",
    methodIds: [],
  },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export const DEFAULT_TAB: TabId = "prove";

/** Resolve a URL hash to a tab, and to a method within it when the hash names one. */
export function resolveHash(hash: string): { tab: TabId; method?: string } | null {
  const key = hash.replace(/^#/, "").trim().toLowerCase();
  if (!key) return null;

  const directTab = TABS.find((tab) => tab.id === key);
  if (directTab) return { tab: directTab.id };

  const owningTab = TABS.find((tab) => (tab.methodIds as readonly string[]).includes(key));
  if (owningTab) return { tab: owningTab.id, method: key };

  return null;
}
