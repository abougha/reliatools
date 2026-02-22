import { describe, expect, it } from "vitest";
import { binomialAcceptanceProbability, solveReliabilityFromBinomial, solveSampleSizeForConfidence } from "../lib/reliabilityMath";

describe("Sample size calculator", () => {
  it("rounds n up using ceil behavior", () => {
    const solved = solveSampleSizeForConfidence(0, 0.9, 0.95);
    expect(Number.isInteger(solved.n)).toBe(true);
    expect(solved.n).toBeGreaterThanOrEqual(solved.nReal);
    expect(solved.n - 1).toBeLessThan(solved.nReal);
  });

  it("solves reliability numerically for f > 0", () => {
    const n = 100;
    const f = 2;
    const confidence = 0.9;
    const reliability = solveReliabilityFromBinomial(n, f, confidence);

    expect(reliability).toBeGreaterThan(0);
    expect(reliability).toBeLessThan(1);

    const acceptance = binomialAcceptanceProbability(n, f, reliability);
    expect(Math.abs(acceptance - (1 - confidence))).toBeLessThan(1e-6);
  });
});
