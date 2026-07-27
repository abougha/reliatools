// lib/nudd.ts
// Pure scoring/classification logic for the NUDD Assessment tool. No React.

export type NuddDimensionKey = "new" | "unique" | "different" | "difficult";

export const DIMENSION_KEYS: NuddDimensionKey[] = [
  "new",
  "unique",
  "different",
  "difficult",
];

export const DIMENSION_LABELS: Record<NuddDimensionKey, string> = {
  new: "New",
  unique: "Unique",
  different: "Different",
  difficult: "Difficult",
};

export type NuddLevel = "Low" | "Medium" | "High";

/** Orthogonal to NuddLevel: what to do about it, not how much novelty is present. */
export type NuddActionPriority = "Standard" | "Focused" | "Elevated";

export interface NuddItem {
  id: string;
  name: string;
  newScore: number; // 0..3, defaults to 0
  uniqueScore: number;
  differentScore: number;
  difficultScore: number;
  justification: string; // "Evidence / Gap"
  createdDate: string;
  updatedDate: string;
}

export function subScores(item: NuddItem): number[] {
  return [item.newScore, item.uniqueScore, item.differentScore, item.difficultScore];
}

/** Total 0..12. */
export function itemTotal(item: NuddItem): number {
  return subScores(item).reduce((a, b) => a + b, 0);
}

/** Inclusive bands: 0-3 Low, 4-7 Medium, 8-12 High. How much novelty is in this feature. */
export function classifyLevel(total: number): NuddLevel {
  if (total <= 3) return "Low";
  if (total <= 7) return "Medium";
  return "High";
}

/** True if ANY single dimension is rated 3. */
export function hasCriticalDimension(item: NuddItem): boolean {
  return subScores(item).some((v) => v === 3);
}

/**
 * What engineering response this item's exposure calls for. Separate from
 * NuddLevel: a Low-total item with one dimension maxed out still needs an
 * elevated response, because that single dimension is where the unknown is.
 */
export function actionPriority(item: NuddItem): NuddActionPriority {
  const total = itemTotal(item);
  if (hasCriticalDimension(item) || total >= 8) return "Elevated";
  if (total >= 4) return "Focused";
  return "Standard";
}

const SUGGESTED_RESPONSE: Record<NuddActionPriority, string> = {
  Standard: "Document assumptions and use normal verification",
  Focused: "Conduct a focused risk review and define an evidence plan",
  Elevated: "Create a technical learning plan; connect to DFMEA/DRBFM and focused validation",
};

const DIFFICULT_DOMINANT_NOTE =
  "Difficult dominant — this is a learning/prototype task, not a test task (schedule risk, not design risk).";

/** Recommended action, keyed off priority (not exposure band) so a Low total with a critical dimension still escalates. */
export function suggestedResponse(item: NuddItem): string {
  const base = SUGGESTED_RESPONSE[actionPriority(item)];
  if (strictDominantDimension(item) === "difficult") {
    return `${base}. ${DIFFICULT_DOMINANT_NOTE}`;
  }
  return base;
}

/**
 * Dimension key(s) with the highest sub-score. Returns [] when every
 * dimension is 0 (no exposure — not "everything is dominant"), and returns
 * every tied key when 2+ dimensions share a max above 0.
 */
export function dominantDimensions(item: NuddItem): NuddDimensionKey[] {
  const entries: [NuddDimensionKey, number][] = [
    ["new", item.newScore],
    ["unique", item.uniqueScore],
    ["different", item.differentScore],
    ["difficult", item.difficultScore],
  ];
  const max = Math.max(...entries.map(([, v]) => v));
  if (max === 0) return [];
  return entries.filter(([, v]) => v === max).map(([k]) => k);
}

/** The single dominant dimension, or null when there's no exposure or a tie ("balanced exposure"). */
export function strictDominantDimension(item: NuddItem): NuddDimensionKey | null {
  const dominants = dominantDimensions(item);
  return dominants.length === 1 ? dominants[0] : null;
}

/** Assessed = has a name. Evidence text is irrelevant to this gate. */
export function isAssessed(item: NuddItem): boolean {
  return item.name.trim().length > 0;
}

/**
 * Evidence completeness is a documentation-state signal, never a filter.
 * Medium/High items (or anything at Elevated priority) need evidence text;
 * Low/Standard items don't.
 */
export function isEvidenceComplete(item: NuddItem): boolean {
  const requiresEvidence = classifyLevel(itemTotal(item)) !== "Low" || actionPriority(item) === "Elevated";
  if (!requiresEvidence) return true;
  return item.justification.trim().length > 0;
}

export interface NuddSummary {
  assessedCount: number;
  lowCount: number;
  mediumCount: number;
  highCount: number;
  standardCount: number;
  focusedCount: number;
  elevatedCount: number;
  evidenceIncompleteCount: number;
  /** Top three assessed items by total, descending; ties broken by highest single dimension. */
  topItems: NuddItem[];
}

function itemMaxDimension(item: NuddItem): number {
  return Math.max(...subScores(item));
}

export function summarize(items: NuddItem[]): NuddSummary {
  const assessed = items.filter(isAssessed);

  const topItems = [...assessed]
    .sort((a, b) => {
      const totalDiff = itemTotal(b) - itemTotal(a);
      if (totalDiff !== 0) return totalDiff;
      return itemMaxDimension(b) - itemMaxDimension(a);
    })
    .slice(0, 3);

  return {
    assessedCount: assessed.length,
    lowCount: assessed.filter((it) => classifyLevel(itemTotal(it)) === "Low").length,
    mediumCount: assessed.filter((it) => classifyLevel(itemTotal(it)) === "Medium").length,
    highCount: assessed.filter((it) => classifyLevel(itemTotal(it)) === "High").length,
    standardCount: assessed.filter((it) => actionPriority(it) === "Standard").length,
    focusedCount: assessed.filter((it) => actionPriority(it) === "Focused").length,
    elevatedCount: assessed.filter((it) => actionPriority(it) === "Elevated").length,
    evidenceIncompleteCount: assessed.filter((it) => !isEvidenceComplete(it)).length,
    topItems,
  };
}
