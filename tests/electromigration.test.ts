import { describe, expect, it } from "vitest";
import { computeElectromigrationMTTF } from "../lib/reliabilityMath";

describe("Electromigration calculator", () => {
  it("decreases lifetime as current density increases", () => {
    const mttfJ1 = computeElectromigrationMTTF(1, 1, 2, 0.7, 125);
    const mttfJ2 = computeElectromigrationMTTF(1, 2, 2, 0.7, 125);

    expect(mttfJ2).toBeLessThan(mttfJ1);
  });
});
