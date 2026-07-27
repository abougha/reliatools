import { describe, expect, it } from "vitest";
import {
  actionPriority,
  classifyLevel,
  dominantDimensions,
  isAssessed,
  isEvidenceComplete,
  itemTotal,
  strictDominantDimension,
  summarize,
  suggestedResponse,
  type NuddItem,
} from "../lib/nudd";

function makeItem(overrides: Partial<NuddItem> = {}): NuddItem {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    name: "",
    newScore: 0,
    uniqueScore: 0,
    differentScore: 0,
    difficultScore: 0,
    justification: "",
    createdDate: now,
    updatedDate: now,
    ...overrides,
  };
}

describe("NUDD scoring logic", () => {
  it("all-zero item has no dominant dimension and no difficult-dominant signal", () => {
    const item = makeItem({ name: "Zero exposure" });
    expect(dominantDimensions(item)).toEqual([]);
    expect(strictDominantDimension(item)).toBeNull();
    expect(suggestedResponse(item)).not.toContain("Difficult dominant");
  });

  it("2/2/2/2 tie is not four dominant dimensions", () => {
    const item = makeItem({
      name: "Balanced",
      newScore: 2,
      uniqueScore: 2,
      differentScore: 2,
      difficultScore: 2,
    });
    expect(dominantDimensions(item)).toHaveLength(4);
    expect(strictDominantDimension(item)).toBeNull();
  });

  it("3/0/0/0 is exposure Low but priority Elevated", () => {
    const item = makeItem({ name: "Single spike", newScore: 3 });
    expect(classifyLevel(itemTotal(item))).toBe("Low");
    expect(actionPriority(item)).toBe("Elevated");
  });

  it("2/2/2/2 (total 8) is exposure High and priority Elevated", () => {
    const item = makeItem({
      name: "High total",
      newScore: 2,
      uniqueScore: 2,
      differentScore: 2,
      difficultScore: 2,
    });
    expect(classifyLevel(itemTotal(item))).toBe("High");
    expect(actionPriority(item)).toBe("Elevated");
  });

  it("High item with empty evidence is still counted in the summary but flagged incomplete", () => {
    const item = makeItem({
      name: "Undocumented risk",
      newScore: 3,
      uniqueScore: 3,
      differentScore: 2,
      difficultScore: 0,
      justification: "",
    });
    expect(isEvidenceComplete(item)).toBe(false);

    const summary = summarize([item]);
    expect(summary.assessedCount).toBe(1);
    expect(summary.highCount).toBe(1);
    expect(summary.evidenceIncompleteCount).toBe(1);
  });

  it("unnamed but fully rated item is excluded from counts", () => {
    const item = makeItem({
      name: "",
      newScore: 3,
      uniqueScore: 3,
      differentScore: 3,
      difficultScore: 3,
    });
    expect(isAssessed(item)).toBe(false);

    const summary = summarize([item]);
    expect(summary.assessedCount).toBe(0);
    expect(summary.highCount).toBe(0);
  });

  it("orders top items by total descending, tie-broken by highest single dimension", () => {
    const low = makeItem({ name: "Low", newScore: 1 });
    const highA = makeItem({ name: "High A", newScore: 3, uniqueScore: 3 }); // total 6, max 3
    const highB = makeItem({ name: "High B", newScore: 2, uniqueScore: 2, differentScore: 2 }); // total 6, max 2
    const highest = makeItem({ name: "Highest", newScore: 3, uniqueScore: 3, differentScore: 3 }); // total 9

    const summary = summarize([low, highA, highB, highest]);
    expect(summary.topItems.map((it) => it.name)).toEqual(["Highest", "High A", "High B"]);
  });

  it("returns fewer than three top items when fewer are assessed", () => {
    const only = makeItem({ name: "Only one", newScore: 1 });
    const summary = summarize([only]);
    expect(summary.topItems).toHaveLength(1);
    expect(summary.topItems[0].name).toBe("Only one");
  });
});
