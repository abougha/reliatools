import { describe, expect, it } from "vitest";
import { computeCoffinMansonCyclesToFailure } from "../lib/reliabilityMath";

describe("Coffin-Manson calculator", () => {
  it("decreases cycles to failure as strain increases", () => {
    const A = 1e5;
    const c = 2;
    const deltaEps1 = 0.005;
    const deltaEps2 = 0.01;

    const n1 = computeCoffinMansonCyclesToFailure(A, c, deltaEps1);
    const n2 = computeCoffinMansonCyclesToFailure(A, c, deltaEps2);

    expect(n2).toBeLessThan(n1);
  });
});
