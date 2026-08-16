import { describe, expect, it } from "vitest";
import {
  binomialAcceptanceProbability,
  extendedBogeySampleSize,
  hassLotSampleSize,
  mtbfChiSquareMultiplier,
  mtbfDemonstrationTime,
  solveReliabilityFromBinomial,
  solveSampleSizeForConfidence,
  toleranceFactorOneSided,
  toleranceFactorTwoSided,
  twoSampleTPower,
  twoSampleTSampleSize,
  weibayesRemainingTest,
} from "../lib/reliabilityMath";
import { chiSqUpperMean } from "../lib/fitpmhf";

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

describe("Success run (zero failures)", () => {
  const vectors: Array<[number, number, number]> = [
    // [reliability, confidence, expected n]
    [0.9, 0.9, 22],
    [0.9, 0.95, 29],
    [0.95, 0.9, 45],
    [0.95, 0.95, 59],
    [0.99, 0.9, 230],
    [0.99, 0.95, 299],
  ];

  it.each(vectors)("R=%s C=%s requires n=%i", (reliability, confidence, expected) => {
    expect(solveSampleSizeForConfidence(0, reliability, confidence).n).toBe(expected);
  });
});

describe("Binomial with allowed failures (R90C90)", () => {
  const vectors: Array<[number, number]> = [
    [0, 22],
    [1, 38],
    [2, 52],
    [3, 65],
  ];

  it.each(vectors)("f=%i requires n=%i", (failures, expected) => {
    expect(solveSampleSizeForConfidence(failures, 0.9, 0.9).n).toBe(expected);
  });
});

describe("Extended bogey (R90C90)", () => {
  const vectors: Array<[number, number[]]> = [
    // [beta, n at t/T = 1, 2, 3]
    [1, [22, 11, 8]],
    [1.5, [22, 8, 5]],
    [2, [22, 6, 3]],
    [3, [22, 3, 1]],
  ];

  it.each(vectors)("beta=%s gives %j units at 1/2/3 lives", (beta, expected) => {
    const actual = [1, 2, 3].map((lifeMultiple) => extendedBogeySampleSize(0.9, 0.9, beta, lifeMultiple).n);
    expect(actual).toEqual(expected);
  });

  it("agrees with the success-run result at one life for any beta", () => {
    for (const beta of [0.5, 1, 2.4, 5]) {
      expect(extendedBogeySampleSize(0.9, 0.9, beta, 1).n).toBe(22);
    }
  });

  it("flags beta <= 1, where testing longer buys almost nothing", () => {
    expect(extendedBogeySampleSize(0.9, 0.9, 0.8, 2).longerTestHelpsLittle).toBe(true);
    expect(extendedBogeySampleSize(0.9, 0.9, 1, 2).longerTestHelpsLittle).toBe(true);
    expect(extendedBogeySampleSize(0.9, 0.9, 1.5, 2).longerTestHelpsLittle).toBe(false);
  });
});

describe("MTBF demonstration multiplier", () => {
  const c90: Array<[number, number]> = [
    [0, 2.3026],
    [1, 3.8897],
    [2, 5.3223],
    [3, 6.6808],
    [4, 7.9936],
  ];
  const c60: Array<[number, number]> = [
    [0, 0.9163],
    [1, 2.0223],
    [2, 3.1054],
  ];

  it.each(c90)("C=90%%, r=%i gives %f", (failures, expected) => {
    expect(mtbfChiSquareMultiplier(0.9, failures)).toBeCloseTo(expected, 4);
  });

  it.each(c60)("C=60%%, r=%i gives %f", (failures, expected) => {
    expect(mtbfChiSquareMultiplier(0.6, failures)).toBeCloseTo(expected, 4);
  });

  it("agrees with the Poisson-bisection route already used by the FIT tool", () => {
    for (const confidence of [0.6, 0.9, 0.95]) {
      for (const failures of [0, 1, 5, 12]) {
        expect(mtbfChiSquareMultiplier(confidence, failures)).toBeCloseTo(chiSqUpperMean(confidence, failures), 8);
      }
    }
  });

  it("scales the required MTBF into a total time budget", () => {
    const result = mtbfDemonstrationTime(5000, 0.9, 1);
    expect(result.multiplier).toBeCloseTo(3.8897, 4);
    expect(result.totalTestTime).toBeCloseTo(19448.6, 1);
  });
});

describe("Tolerance factors", () => {
  const oneSided: Array<[number, number]> = [
    [5, 2.7423],
    [8, 2.2186],
    [10, 2.0657],
    [12, 1.9662],
    [15, 1.8668],
    [20, 1.7652],
    [22, 1.7366],
  ];

  it.each(oneSided)("one-sided 90/90 at n=%i gives k=%f", (n, expected) => {
    expect(toleranceFactorOneSided(n, 0.9, 0.9)).toBeCloseTo(expected, 4);
  });

  const twoSided: Array<[number, number]> = [
    [10, 2.535],
    [20, 2.1524],
    [30, 2.0252],
  ];

  it.each(twoSided)("two-sided Howe 90/90 at n=%i gives k=%f", (n, expected) => {
    expect(toleranceFactorTwoSided(n, 0.9, 0.9)).toBeCloseTo(expected, 3);
  });

  it("reproduces the headline attribute-vs-variables trade", () => {
    // 22 units by the attribute route (R90C90, zero failures) vs 10 by the
    // variables route -- but only if the design carries k*s of margin.
    expect(solveSampleSizeForConfidence(0, 0.9, 0.9).n).toBe(22);
    expect(toleranceFactorOneSided(10, 0.9, 0.9)).toBeCloseTo(2.07, 2);
  });
});

describe("Two-sample t-test sizing (alpha=0.05 two-sided, power=0.80)", () => {
  const vectors: Array<[number, number]> = [
    [0.5, 64],
    [0.8, 26],
    [1.0, 17],
    [1.5, 9],
  ];

  it.each(vectors)("d=%s needs n=%i per arm", (d, expected) => {
    expect(twoSampleTSampleSize(d, 0.05, 0.8, true).nPerArm).toBe(expected);
  });

  it("returns the smallest sufficient n, not merely a sufficient one", () => {
    for (const [d, expected] of [
      [0.5, 64],
      [1.0, 17],
      [1.5, 9],
    ] as Array<[number, number]>) {
      expect(twoSampleTPower(d, expected, 0.05, true)).toBeGreaterThanOrEqual(0.8);
      expect(twoSampleTPower(d, expected - 1, 0.05, true)).toBeLessThan(0.8);
    }
  });

  it("needs fewer units one-sided than two-sided", () => {
    expect(twoSampleTSampleSize(0.5, 0.05, 0.8, false).nPerArm).toBeLessThan(
      twoSampleTSampleSize(0.5, 0.05, 0.8, true).nPerArm
    );
  });
});

describe("Weibayes with prior credit", () => {
  const base = {
    reliability: 0.9,
    confidenceLevel: 0.9,
    beta: 2,
    priorFailures: 0,
    priorUnits: 0,
    priorLifeMultiple: 0,
    priorCreditFactor: 1,
    testLifeMultiple: 1,
  };

  it("collapses to the extended bogey when there is no prior", () => {
    expect(weibayesRemainingTest(base).unitsRequired).toBe(22);
    expect(weibayesRemainingTest({ ...base, testLifeMultiple: 2 }).unitsRequired).toBe(6);
    expect(weibayesRemainingTest({ ...base, testLifeMultiple: 3 }).unitsRequired).toBe(3);
  });

  it("credits prior evidence against the requirement", () => {
    // 10 prior units at one life = 10 units of damage against a 21.85 requirement.
    const result = weibayesRemainingTest({ ...base, priorUnits: 10, priorLifeMultiple: 1 });
    expect(result.requiredDamage).toBeCloseTo(21.8543, 4);
    expect(result.creditedPriorDamage).toBeCloseTo(10, 10);
    expect(result.unitsRequired).toBe(12);
    expect(result.unitsWithoutPrior).toBe(22);
  });

  it("discounts the prior by the credit factor", () => {
    const half = weibayesRemainingTest({
      ...base,
      priorUnits: 10,
      priorLifeMultiple: 1,
      priorCreditFactor: 0.5,
    });
    expect(half.creditedPriorDamage).toBeCloseTo(5, 10);
    expect(half.unitsRequired).toBe(17);

    const none = weibayesRemainingTest({
      ...base,
      priorUnits: 10,
      priorLifeMultiple: 1,
      priorCreditFactor: 0,
    });
    expect(none.unitsRequired).toBe(none.unitsWithoutPrior);
  });

  it("reports when the prior alone already satisfies the claim", () => {
    const result = weibayesRemainingTest({ ...base, priorUnits: 30, priorLifeMultiple: 1 });
    expect(result.priorSatisfiesClaim).toBe(true);
    expect(result.unitsRequired).toBe(0);
  });

  it("uses the chi-square form when the prior contains failures", () => {
    // Continuous chi-square form, so it need not equal the discrete binomial n.
    const result = weibayesRemainingTest({ ...base, priorFailures: 1 });
    expect(result.requiredDamage).toBeCloseTo(3.8897 / -Math.log(0.9), 3);
    expect(result.unitsRequired).toBe(37);
    expect(solveSampleSizeForConfidence(1, 0.9, 0.9).n).toBe(38);
  });
});

describe("HASS lot sampling", () => {
  it("sizes the sample from the lot, the escape rate and the confidence", () => {
    const result = hassLotSampleSize(1000, 0.01, 0.9);
    expect(result.defectsAssumed).toBe(10);
    expect(result.detectionProbability).toBeGreaterThanOrEqual(0.9);
    expect(result.n).toBeGreaterThan(0);
    expect(hassLotSampleSize(1000, 0.01, 0.9).n).toBe(205);
  });

  it("returns the smallest sufficient sample", () => {
    const { n } = hassLotSampleSize(500, 0.02, 0.95);
    const oneSmaller = n - 1;
    const good = 500 - 10;
    const miss = Math.exp(
      // log C(good, n-1) - log C(500, n-1)
      lnChoose(good, oneSmaller) - lnChoose(500, oneSmaller)
    );
    expect(1 - miss).toBeLessThan(0.95);
  });

  it("demands more sampling as the target escape rate falls", () => {
    const loose = hassLotSampleSize(1000, 0.05, 0.9).n;
    const tight = hassLotSampleSize(1000, 0.005, 0.9).n;
    expect(tight).toBeGreaterThan(loose);
  });

  it("flags the case where only a 100% screen meets the target", () => {
    // A 20-unit lot assumed to carry a single defective: detection is n/20, so
    // 99% confidence is unreachable without screening every unit.
    const result = hassLotSampleSize(20, 0.001, 0.99);
    expect(result.defectsAssumed).toBe(1);
    expect(result.n).toBe(20);
    expect(result.requiresFullScreen).toBe(true);
  });

  it("does not flag a full screen when sampling suffices", () => {
    expect(hassLotSampleSize(1000, 0.01, 0.9).requiresFullScreen).toBe(false);
  });
});

function lnChoose(n: number, k: number): number {
  let value = 0;
  for (let i = 0; i < k; i += 1) {
    value += Math.log(n - i) - Math.log(i + 1);
  }
  return value;
}
