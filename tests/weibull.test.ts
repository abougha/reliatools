import { describe, expect, it } from "vitest";
import {
  buildPlotPoints,
  fitDataset,
  gamma,
  inverseNormalCdf,
  weibullBQuantile,
  weibullReliability,
  type DataPoint,
} from "../app/tools/Weibull/_lib/weibullMath";

const SECTION_5_2_DATA: DataPoint[] = [
  { t: 16, status: "FAIL" },
  { t: 34, status: "FAIL" },
  { t: 40, status: "SUSP" },
  { t: 53, status: "FAIL" },
  { t: 60, status: "SUSP" },
  { t: 75, status: "FAIL" },
  { t: 80, status: "SUSP" },
  { t: 93, status: "FAIL" },
  { t: 100, status: "SUSP" },
  { t: 120, status: "FAIL" },
  { t: 130, status: "SUSP" },
];

function withinRelative(actual: number, expected: number, relTolerance: number): boolean {
  return Math.abs(actual - expected) <= Math.abs(expected) * relTolerance;
}

describe("Weibull calculator", () => {
  it("regression exact recovery on synthetic data", () => {
    const data: DataPoint[] = [];
    for (let i = 1; i <= 20; i += 1) {
      const F = (i - 0.3) / 20.4;
      const t = 1000 * Math.pow(-Math.log(1 - F), 1 / 2);
      data.push({ t, status: "FAIL" });
    }

    const output = fitDataset(data, "REGRESSION");
    expect(output.fit).toBeDefined();
    const fit = output.fit!;
    expect(withinRelative(fit.beta, 2.0, 0.005)).toBe(true);
    expect(withinRelative(fit.eta, 1000, 0.005)).toBe(true);
  });

  it("MLE censored benchmark matches scipy reference", () => {
    const output = fitDataset(SECTION_5_2_DATA, "MLE", 100, 90);
    expect(output.fit).toBeDefined();
    const fit = output.fit!;
    expect(withinRelative(fit.beta, 1.8144, 0.005)).toBe(true);
    expect(withinRelative(fit.eta, 110.72, 0.005)).toBe(true);
  });

  it("closed-form checks", () => {
    expect(Math.abs(weibullBQuantile(2, 10000, 0.1) - 3245.9)).toBeLessThan(0.1);
    expect(Math.abs(10000 * gamma(1 + 1 / 2) - 8862.27)).toBeLessThan(0.1);
    expect(Math.abs(weibullReliability(5000, 2, 10000) - 0.7788)).toBeLessThan(0.0005);
  });

  it("Johnson ranks match the worked verification case", () => {
    const plotPoints = buildPlotPoints(SECTION_5_2_DATA);
    const failPoints = plotPoints.filter((point) => point.status === "FAIL");
    const expected = [
      { t: 16, F: 0.0614 },
      { t: 34, F: 0.1491 },
      { t: 53, F: 0.2466 },
      { t: 75, F: 0.358 },
      { t: 93, F: 0.4916 },
      { t: 120, F: 0.6699 },
    ];

    expect(failPoints.length).toBe(expected.length);
    failPoints.forEach((point, index) => {
      expect(point.t).toBe(expected[index].t);
      expect(point.F_plot).toBeDefined();
      expect(Math.abs((point.F_plot as number) - expected[index].F)).toBeLessThan(0.0005);
    });
  });

  it("Johnson ranks reduce to plain Bernard positions with no suspensions", () => {
    const data: DataPoint[] = [
      { t: 120, status: "FAIL" },
      { t: 150, status: "FAIL" },
      { t: 175, status: "FAIL" },
      { t: 210, status: "FAIL" },
      { t: 260, status: "FAIL" },
      { t: 320, status: "FAIL" },
    ];
    const plotPoints = buildPlotPoints(data);
    const n = data.length;
    plotPoints.forEach((point, index) => {
      const rank = index + 1;
      const expectedF = (rank - 0.3) / (n + 0.4);
      expect(Math.abs((point.F_plot as number) - expectedF)).toBeLessThan(1e-9);
    });
  });

  it("z(90%) matches the Acklam approximation reference", () => {
    const z = inverseNormalCdf(0.95);
    expect(Math.abs(z - 1.6449)).toBeLessThan(0.001);
  });

  it("Fisher-matrix confidence bounds match the reference table within 2%", () => {
    const output = fitDataset(SECTION_5_2_DATA, "MLE", undefined, 90);
    expect(output.fit).toBeDefined();
    const bounds = output.fit!.bounds;
    expect(bounds).toBeDefined();

    expect(withinRelative(bounds!.beta!.lower, 1.029, 0.02)).toBe(true);
    expect(withinRelative(bounds!.beta!.upper, 3.198, 0.02)).toBe(true);
    expect(withinRelative(bounds!.eta!.lower, 75.52, 0.02)).toBe(true);
    expect(withinRelative(bounds!.eta!.upper, 162.33, 0.02)).toBe(true);
    expect(withinRelative(bounds!.b10!.lower, 15.75, 0.02)).toBe(true);
    expect(withinRelative(bounds!.b10!.upper, 65.15, 0.02)).toBe(true);
  });

  it("degenerate guards produce errors instead of a giant beta", () => {
    const singleFailure = fitDataset([{ t: 100, status: "FAIL" }], "MLE");
    expect(singleFailure.fit).toBeUndefined();
    expect(singleFailure.error).toMatch(/at least two distinct failure times/i);

    const identicalTimes = fitDataset(
      [
        { t: 100, status: "FAIL" },
        { t: 100, status: "FAIL" },
        { t: 100, status: "FAIL" },
      ],
      "MLE",
    );
    expect(identicalTimes.fit).toBeUndefined();
    expect(identicalTimes.error).toMatch(/at least two distinct failure times/i);

    const allSuspensions = fitDataset(
      [
        { t: 50, status: "SUSP" },
        { t: 80, status: "SUSP" },
      ],
      "MLE",
    );
    expect(allSuspensions.fit).toBeUndefined();
    expect(allSuspensions.error).toMatch(/at least one failure/i);
  });

  it("sanity: bounds contain the point estimate, R bounds in [0,1], band monotone in t", () => {
    const output = fitDataset(SECTION_5_2_DATA, "MLE", 100, 90);
    const fit = output.fit!;
    const bounds = fit.bounds!;

    expect(bounds.beta!.lower).toBeLessThanOrEqual(fit.beta);
    expect(bounds.beta!.upper).toBeGreaterThanOrEqual(fit.beta);
    expect(bounds.eta!.lower).toBeLessThanOrEqual(fit.eta);
    expect(bounds.eta!.upper).toBeGreaterThanOrEqual(fit.eta);
    expect(bounds.b10!.lower).toBeLessThanOrEqual(fit.b10);
    expect(bounds.b10!.upper).toBeGreaterThanOrEqual(fit.b10);

    expect(bounds.rMission).toBeDefined();
    expect(bounds.rMission!.lower).toBeGreaterThanOrEqual(0);
    expect(bounds.rMission!.upper).toBeLessThanOrEqual(1);
    expect(bounds.rMission!.lower).toBeLessThanOrEqual(fit.rMission as number);
    expect(bounds.rMission!.upper).toBeGreaterThanOrEqual(fit.rMission as number);

    let lastT = -Infinity;
    for (const point of bounds.band) {
      expect(point.t).toBeGreaterThan(lastT);
      lastT = point.t;
      if (point.tLower !== undefined && point.tUpper !== undefined) {
        expect(point.tLower).toBeLessThanOrEqual(point.t);
        expect(point.tUpper).toBeGreaterThanOrEqual(point.t);
      }
    }
  });
});
