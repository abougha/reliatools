import { describe, expect, it } from "vitest";
import {
  chi2Cdf,
  chi2Inv,
  logGamma,
  noncentralTCdf,
  noncentralTQuantile,
  normalCdf,
  normalQuantile,
  regularizedGammaP,
  regularizedGammaQ,
  regularizedIncompleteBeta,
  studentTCdf,
  studentTQuantile,
} from "../lib/specialFunctions";

describe("logGamma", () => {
  it("matches closed-form values", () => {
    expect(logGamma(1)).toBeCloseTo(0, 12);
    expect(logGamma(2)).toBeCloseTo(0, 12);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 12);
    expect(logGamma(10)).toBeCloseTo(Math.log(362880), 10);
  });

  it("satisfies the recurrence logGamma(x+1) = logGamma(x) + ln(x)", () => {
    for (const x of [0.3, 1.7, 4.25, 12.5]) {
      expect(logGamma(x + 1)).toBeCloseTo(logGamma(x) + Math.log(x), 10);
    }
  });
});

describe("incomplete gamma", () => {
  it("reduces to the exponential CDF at a = 1", () => {
    for (const x of [0.5, 2, 7]) {
      expect(regularizedGammaP(1, x)).toBeCloseTo(1 - Math.exp(-x), 12);
    }
  });

  it("keeps P + Q = 1 across both the series and continued-fraction branches", () => {
    for (const [a, x] of [
      [0.5, 0.1],
      [3, 2],
      [3, 9],
      [20, 25],
    ]) {
      expect(regularizedGammaP(a, x) + regularizedGammaQ(a, x)).toBeCloseTo(1, 12);
    }
  });
});

describe("incomplete beta", () => {
  it("matches the exact binomial identity I_0.5(2,3) = 11/16", () => {
    expect(regularizedIncompleteBeta(2, 3, 0.5)).toBeCloseTo(0.6875, 12);
  });

  it("satisfies the symmetry I_x(a,b) = 1 - I_(1-x)(b,a)", () => {
    for (const [a, b, x] of [
      [2, 5, 0.3],
      [0.5, 4.5, 0.8],
      [10, 1.5, 0.45],
    ]) {
      expect(regularizedIncompleteBeta(a, b, x)).toBeCloseTo(1 - regularizedIncompleteBeta(b, a, 1 - x), 12);
    }
  });
});

describe("normal distribution", () => {
  it("returns published quantiles", () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 12);
    expect(normalQuantile(0.9)).toBeCloseTo(1.2815515655, 9);
    expect(normalQuantile(0.95)).toBeCloseTo(1.6448536270, 9);
    expect(normalQuantile(0.975)).toBeCloseTo(1.9599639845, 9);
    expect(normalQuantile(0.99)).toBeCloseTo(2.3263478740, 9);
  });

  it("returns published CDF values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 12);
    expect(normalCdf(1.9599639845)).toBeCloseTo(0.975, 10);
    expect(normalCdf(-1.2815515655)).toBeCloseTo(0.1, 10);
  });

  it("round-trips quantile through CDF", () => {
    for (const p of [0.001, 0.02, 0.25, 0.6, 0.99, 0.9999]) {
      expect(normalCdf(normalQuantile(p))).toBeCloseTo(p, 12);
    }
  });
});

describe("chi-square", () => {
  it("matches the exact df=2 identity chi2Inv(p, 2) = -2 ln(1-p)", () => {
    for (const p of [0.5, 0.6, 0.9, 0.95]) {
      expect(chi2Inv(p, 2)).toBeCloseTo(-2 * Math.log(1 - p), 10);
    }
  });

  it("returns published table values", () => {
    expect(chi2Inv(0.95, 1)).toBeCloseTo(3.8415, 4);
    expect(chi2Inv(0.95, 2)).toBeCloseTo(5.9915, 4);
    expect(chi2Inv(0.1, 9)).toBeCloseTo(4.1682, 3);
    expect(chi2Inv(0.1, 19)).toBeCloseTo(11.6509, 3);
    expect(chi2Inv(0.1, 29)).toBeCloseTo(19.7677, 3);
  });

  it("round-trips quantile through CDF for odd and even df", () => {
    for (const df of [1, 3, 9, 20, 47]) {
      for (const p of [0.05, 0.5, 0.9, 0.99]) {
        expect(chi2Cdf(chi2Inv(p, df), df)).toBeCloseTo(p, 9);
      }
    }
  });
});

describe("Student t", () => {
  it("returns published quantiles", () => {
    expect(studentTQuantile(0.95, 1)).toBeCloseTo(6.3138, 3);
    expect(studentTQuantile(0.975, 10)).toBeCloseTo(2.2281, 3);
    expect(studentTQuantile(0.975, 32)).toBeCloseTo(2.0369, 3);
    expect(studentTQuantile(0.975, 50)).toBeCloseTo(2.0086, 3);
  });

  it("is symmetric about zero", () => {
    expect(studentTCdf(0, 7)).toBeCloseTo(0.5, 12);
    expect(studentTCdf(-1.4, 12)).toBeCloseTo(1 - studentTCdf(1.4, 12), 12);
  });

  it("approaches the normal for large df", () => {
    expect(studentTQuantile(0.975, 100000)).toBeCloseTo(normalQuantile(0.975), 4);
  });
});

describe("noncentral t", () => {
  it("collapses to the central t at delta = 0", () => {
    for (const df of [4, 9, 32]) {
      for (const t of [-2.5, -0.4, 0, 1.1, 3.3]) {
        expect(noncentralTCdf(t, df, 0)).toBeCloseTo(studentTCdf(t, df), 10);
      }
    }
  });

  it("satisfies the reflection P(t; df, d) = 1 - P(-t; df, -d)", () => {
    for (const [t, df, d] of [
      [1.5, 9, 2.0],
      [-0.8, 15, 4.05],
      [6.5, 9, 4.05],
    ]) {
      expect(noncentralTCdf(t, df, d)).toBeCloseTo(1 - noncentralTCdf(-t, df, -d), 10);
    }
  });

  it("approaches the shifted normal for large df", () => {
    expect(noncentralTCdf(3, 200000, 2)).toBeCloseTo(normalCdf(1), 4);
  });

  it("round-trips quantile through CDF", () => {
    for (const [df, delta] of [
      [9, 4.0526],
      [4, 1.5],
      [21, 6.0112],
    ]) {
      for (const p of [0.05, 0.5, 0.9, 0.99]) {
        expect(noncentralTCdf(noncentralTQuantile(p, df, delta), df, delta)).toBeCloseTo(p, 9);
      }
    }
  });
});
