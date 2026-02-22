import { describe, expect, it } from "vitest";
import { computeArrheniusAF } from "../lib/reliabilityMath";

describe("Arrhenius calculator", () => {
  it("passes sanity and monotonicity checks", () => {
    const af = computeArrheniusAF(0.7, 25, 105);
    expect(Number.isFinite(af)).toBe(true);
    expect(af).toBeGreaterThan(1);
    expect(af).toBeLessThan(1e6);

    const afHotterStress = computeArrheniusAF(0.7, 25, 125);
    expect(afHotterStress).toBeGreaterThan(af);

    const afHigherEa = computeArrheniusAF(1.0, 25, 105);
    expect(afHigherEa).toBeGreaterThan(af);
  });
});
