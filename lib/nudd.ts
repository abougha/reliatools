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

export interface NuddItem {
  id: string;
  name: string;
  newScore: number | null; // 0..3 or null when unrated
  uniqueScore: number | null;
  differentScore: number | null;
  difficultScore: number | null;
  justification: string;
  createdDate: string;
  updatedDate: string;
}

export function subScores(item: NuddItem): (number | null)[] {
  return [
    item.newScore,
    item.uniqueScore,
    item.differentScore,
    item.difficultScore,
  ];
}

export function isRated(item: NuddItem): boolean {
  return subScores(item).every((v) => v === 0 || v === 1 || v === 2 || v === 3);
}

/** Total 0..12, or null if any dimension is unrated. */
export function itemTotal(item: NuddItem): number | null {
  if (!isRated(item)) return null;
  return subScores(item).reduce<number>((a, b) => a + (b as number), 0);
}

/** Inclusive bands: 0-3 Low, 4-7 Medium, 8-12 High. */
export function classifyLevel(total: number): NuddLevel {
  if (total <= 3) return "Low";
  if (total <= 7) return "Medium";
  return "High";
}

/** True if ANY single dimension is rated 3 (critical-dimension flag). */
export function hasCriticalDimension(item: NuddItem): boolean {
  return subScores(item).some((v) => v === 3);
}

/** Med/High require justification; Low does not. Requires all four rated. */
export function isComplete(item: NuddItem): boolean {
  if (!isRated(item)) return false;
  if (!item.name.trim()) return false;
  const total = itemTotal(item) as number;
  const level = classifyLevel(total);
  if (level === "Low") return true;
  return item.justification.trim().length > 0;
}

/** Dimension key(s) with the highest sub-score; ties return all tied keys. */
export function dominantDimensions(item: NuddItem): NuddDimensionKey[] {
  if (!isRated(item)) return [];
  const entries: [NuddDimensionKey, number][] = [
    ["new", item.newScore as number],
    ["unique", item.uniqueScore as number],
    ["different", item.differentScore as number],
    ["difficult", item.difficultScore as number],
  ];
  const max = Math.max(...entries.map(([, v]) => v));
  return entries.filter(([, v]) => v === max).map(([k]) => k);
}

export interface NuddSummary {
  completedCount: number;
  average: number | null; // null when zero completed items (guards divide-by-zero)
  overallLevel: NuddLevel | null;
  highestItemId: string | null;
  highestItemTotal: number | null;
  highCount: number; // completed items classified High
  criticalCount: number; // completed items with a critical dimension flag
  difficultIsDominantInHighest: boolean;
}

export function summarize(items: NuddItem[]): NuddSummary {
  const completed = items.filter(isComplete);
  const n = completed.length;

  if (n === 0) {
    return {
      completedCount: 0,
      average: null,
      overallLevel: null,
      highestItemId: null,
      highestItemTotal: null,
      highCount: 0,
      criticalCount: 0,
      difficultIsDominantInHighest: false,
    };
  }

  const totals = completed.map((it) => itemTotal(it) as number);
  const sum = totals.reduce((a, b) => a + b, 0);
  const average = Math.round((sum / n) * 10) / 10; // one decimal

  let highestIdx = 0;
  for (let i = 1; i < completed.length; i++) {
    if (totals[i] > totals[highestIdx]) highestIdx = i;
  }
  const highest = completed[highestIdx];

  return {
    completedCount: n,
    average,
    overallLevel: classifyLevel(average),
    highestItemId: highest.id,
    highestItemTotal: totals[highestIdx],
    highCount: completed.filter(
      (it) => classifyLevel(itemTotal(it) as number) === "High"
    ).length,
    criticalCount: completed.filter(hasCriticalDimension).length,
    difficultIsDominantInHighest: dominantDimensions(highest).includes("difficult"),
  };
}
