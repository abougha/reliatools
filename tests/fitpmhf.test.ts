import { describe, it, expect } from "vitest";
import { convert, lambdaFromKnown, poissonCdf, chiSqUpperMean, evidenceCheck } from "../lib/fitpmhf";

const close = (a: number, b: number, rel = 1e-4) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

describe("Module 1 converter", () => {
  it("reproduces the canonical 1 FIT example", () => {
    const r = convert({ known: "fit", value: 1, missionHours: 10000, fleetSize: 100000 });
    expect(close(r.ppm, 10, 1e-3)).toBe(true);                    // ~10 ppm
    expect(close(r.expectedFleetFailures, 1, 1e-3)).toBe(true);   // ~1 fleet failure
    expect(close(r.mttf, 1e9)).toBe(true);                        // MTTF = 1e9 h
    expect(close(r.nines, 5, 1e-3)).toBe(true);                   // 5 nines
    expect(r.reliability).toBeGreaterThan(0.99998);
  });

  it("reliability -> lambda round-trips", () => {
    const lam = lambdaFromKnown("reliability", 0.99, 10000);
    const r = convert({ known: "lambda", value: lam, missionHours: 10000, fleetSize: 1 });
    expect(close(r.reliability, 0.99)).toBe(true);
  });

  it("ppm -> lambda round-trips", () => {
    const lam = lambdaFromKnown("ppm", 500, 10000); // 500 ppm over mission
    const r = convert({ known: "lambda", value: lam, missionHours: 10000, fleetSize: 1 });
    expect(close(r.ppm, 500, 1e-3)).toBe(true);
  });

  it("handles perfect reliability (lambda = 0)", () => {
    const r = convert({ known: "fit", value: 0, missionHours: 10000, fleetSize: 100 });
    expect(r.failureProb).toBe(0);
    expect(r.mttf).toBe(Infinity);
    expect(r.nines).toBe(Infinity);
  });
});

describe("chi-square upper bound", () => {
  it("r=0, C=0.90 equals -ln(0.10)", () => {
    expect(close(chiSqUpperMean(0.9, 0), Math.log(10))).toBe(true); // 2.302585
  });
  it("r=1, C=0.90 equals chi2(0.90,4)/2", () => {
    expect(close(chiSqUpperMean(0.9, 1), 3.8897, 1e-3)).toBe(true);
  });
  it("r=0, C=0.60 equals -ln(0.40)", () => {
    expect(close(chiSqUpperMean(0.6, 0), -Math.log(0.4))).toBe(true);
  });
  it("poissonCdf(r, m) recovers the confidence at the bound", () => {
    const m = chiSqUpperMean(0.9, 2);
    expect(close(poissonCdf(2, m), 0.1, 1e-4)).toBe(true);
  });
});

describe("Module 2 evidence check", () => {
  it("1 FIT @90% zero-failure needs ~2.3e9 equivalent hours", () => {
    const e = evidenceCheck({
      targetFit: 1, confidence: 0.9, units: 1, hoursPerUnit: 1, accelerationFactor: 1, failures: 0,
    });
    expect(close(e.requiredEquivHours, 2.302585e9)).toBe(true);
  });

  it("flags a plan that is far short of the target", () => {
    const e = evidenceCheck({
      targetFit: 1, confidence: 0.9, units: 100, hoursPerUnit: 1000, accelerationFactor: 20, failures: 0,
    });
    expect(e.equivHours).toBe(2e6);
    expect(e.pass).toBe(false);
    expect(e.shortfallFactor).toBeGreaterThan(100);
  });

  it("passes when equivalent hours exceed the requirement", () => {
    // Same plan as the shortfall case (2e6 equiv-hours demonstrates ~1151 FIT @90%),
    // so the target must clear that bar for a PASS.
    const e = evidenceCheck({
      targetFit: 2000, confidence: 0.9, units: 100, hoursPerUnit: 1000, accelerationFactor: 20, failures: 0,
    });
    expect(e.pass).toBe(true);
    expect(e.demonstratedFit).toBeLessThanOrEqual(2000);
  });
});
