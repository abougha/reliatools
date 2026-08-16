// Hand-rolled special functions. This project deliberately carries no statistics
// dependency, so every routine here is implemented from first principles and pinned
// against published vectors in tests/specialFunctions.test.ts.
//
// Quantile convention throughout: LOWER tail. `chi2Inv(p, df)` returns the x with
// P(X <= x) = p, matching scipy's `chi2.ppf`. Reliability texts often write
// "chi2(alpha, df)" meaning the UPPER-tail point instead; the domain wrappers in
// reliabilityMath.ts do that conversion explicitly rather than leaving it implicit.

const EPS = 3e-16;
const FPMIN = 1e-300;
const SQRT_2PI = Math.sqrt(2 * Math.PI);

const LANCZOS_G = 7;
const LANCZOS_COEFFS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** Natural log of the gamma function (Lanczos, g=7). */
export function logGamma(x: number): number {
  if (!Number.isFinite(x)) {
    throw new Error("logGamma requires a finite argument.");
  }
  if (x < 0.5) {
    // Reflection: Gamma(x)Gamma(1-x) = pi / sin(pi x)
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  }
  const z = x - 1;
  let series = LANCZOS_COEFFS[0];
  for (let i = 1; i < LANCZOS_COEFFS.length; i += 1) {
    series += LANCZOS_COEFFS[i] / (z + i);
  }
  const t = z + LANCZOS_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(series);
}

// Lower incomplete gamma by series expansion; converges fast for x < a+1.
function gammaSeries(a: number, x: number): number {
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let i = 0; i < 1000; i += 1) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

// Upper incomplete gamma by modified Lentz continued fraction; used for x >= a+1.
function gammaContinuedFraction(a: number, x: number): number {
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 1000; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** Regularized lower incomplete gamma P(a, x). */
export function regularizedGammaP(a: number, x: number): number {
  if (a <= 0) throw new Error("regularizedGammaP requires a > 0.");
  if (x < 0) throw new Error("regularizedGammaP requires x >= 0.");
  if (x === 0) return 0;
  return x < a + 1 ? gammaSeries(a, x) : 1 - gammaContinuedFraction(a, x);
}

/** Regularized upper incomplete gamma Q(a, x) = 1 - P(a, x). */
export function regularizedGammaQ(a: number, x: number): number {
  if (a <= 0) throw new Error("regularizedGammaQ requires a > 0.");
  if (x < 0) throw new Error("regularizedGammaQ requires x >= 0.");
  if (x === 0) return 1;
  return x < a + 1 ? 1 - gammaSeries(a, x) : gammaContinuedFraction(a, x);
}

// Continued fraction for the incomplete beta (Lentz).
function betaContinuedFraction(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 500; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
export function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (a <= 0 || b <= 0) throw new Error("regularizedIncompleteBeta requires a > 0 and b > 0.");
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Standard normal CDF, routed through the incomplete gamma so erf stays exact to ~1e-15. */
export function normalCdf(z: number): number {
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0;
  if (z === 0) return 0.5;
  const half = 0.5 * regularizedGammaP(0.5, (z * z) / 2);
  return z > 0 ? 0.5 + half : 0.5 - half;
}

// Acklam's rational approximation; good to ~1e-9 before refinement.
function normalQuantileApprox(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      ((((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1))
    );
  }
  if (p > pHigh) {
    const q = Math.sqrt(-2 * Math.log1p(-p));
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

/** Standard normal inverse CDF (lower tail), refined to machine precision by Halley steps. */
export function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) throw new Error("normalQuantile requires 0 < p < 1.");
  let x = normalQuantileApprox(p);
  for (let i = 0; i < 3; i += 1) {
    const err = normalCdf(x) - p;
    const u = err * SQRT_2PI * Math.exp((x * x) / 2);
    x -= u / (1 + (x * u) / 2);
  }
  return x;
}

/** Chi-square CDF: P(X <= x) with df degrees of freedom. */
export function chi2Cdf(x: number, df: number): number {
  if (df <= 0) throw new Error("chi2Cdf requires df > 0.");
  return x <= 0 ? 0 : regularizedGammaP(df / 2, x / 2);
}

/** Chi-square LOWER-tail quantile: the x with P(X <= x) = p. Mirrors scipy chi2.ppf. */
export function chi2Inv(p: number, df: number): number {
  if (df <= 0) throw new Error("chi2Inv requires df > 0.");
  if (!(p >= 0 && p < 1)) throw new Error("chi2Inv requires 0 <= p < 1.");
  if (p === 0) return 0;

  let lo = 0;
  let hi = Math.max(1, df + 10 * Math.sqrt(2 * df));
  while (chi2Cdf(hi, df) < p) hi *= 2;
  for (let i = 0; i < 200; i += 1) {
    const mid = 0.5 * (lo + hi);
    if (chi2Cdf(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** Student's t CDF. */
export function studentTCdf(t: number, df: number): number {
  if (df <= 0) throw new Error("studentTCdf requires df > 0.");
  if (!Number.isFinite(t)) return t > 0 ? 1 : 0;
  const x = df / (df + t * t);
  const half = 0.5 * regularizedIncompleteBeta(df / 2, 0.5, x);
  return t >= 0 ? 1 - half : half;
}

/** Student's t lower-tail quantile. */
export function studentTQuantile(p: number, df: number): number {
  if (df <= 0) throw new Error("studentTQuantile requires df > 0.");
  if (!(p > 0 && p < 1)) throw new Error("studentTQuantile requires 0 < p < 1.");

  let lo = -1;
  let hi = 1;
  while (studentTCdf(lo, df) > p) lo *= 2;
  while (studentTCdf(hi, df) < p) hi *= 2;
  for (let i = 0; i < 200; i += 1) {
    const mid = 0.5 * (lo + hi);
    if (studentTCdf(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * Noncentral t CDF, P(T' <= t) for T' = (Z + delta) / sqrt(X_df / df).
 *
 * Lenth (1989) / AS 243: the Poisson-weighted incomplete-beta series
 *   P = Phi(-delta) + sum_j [ p_j I_x(j+1/2, df/2) + q_j I_x(j+1, df/2) ],  x = t^2/(t^2+df)
 * with p_j, q_j advanced by their ratio recurrences rather than recomputed.
 * Negative t is handled by the reflection P(t; df, delta) = 1 - P(-t; df, -delta).
 */
export function noncentralTCdf(t: number, df: number, delta: number): number {
  if (df <= 0) throw new Error("noncentralTCdf requires df > 0.");
  if (!Number.isFinite(t)) return t > 0 ? 1 : 0;
  if (t < 0) return 1 - noncentralTCdf(-t, df, -delta);

  const base = normalCdf(-delta);
  if (t === 0) return base;

  const x = (t * t) / (t * t + df);
  const halfLambda = (delta * delta) / 2;
  const expTerm = Math.exp(-halfLambda);

  let p = 0.5 * expTerm;
  let q = (delta * expTerm) / SQRT_2PI;
  let sum = 0;

  for (let j = 0; j < 2000; j += 1) {
    sum += p * regularizedIncompleteBeta(j + 0.5, df / 2, x) + q * regularizedIncompleteBeta(j + 1, df / 2, x);
    // Remaining Poisson mass bounds the truncation error (I_x <= 1), so this is a
    // real error bound, not a heuristic on the term size.
    if (j > halfLambda && p < 1e-18 && Math.abs(q) < 1e-18) break;
    p *= halfLambda / (j + 1);
    q *= halfLambda / (j + 1.5);
  }

  return Math.min(1, Math.max(0, base + sum));
}

/** Noncentral t lower-tail quantile: the t with P(T' <= t) = p. */
export function noncentralTQuantile(p: number, df: number, delta: number): number {
  if (df <= 0) throw new Error("noncentralTQuantile requires df > 0.");
  if (!(p > 0 && p < 1)) throw new Error("noncentralTQuantile requires 0 < p < 1.");

  let lo = delta - 1;
  let hi = delta + 1;
  while (noncentralTCdf(lo, df, delta) > p) lo -= Math.max(1, Math.abs(lo));
  while (noncentralTCdf(hi, df, delta) < p) hi += Math.max(1, Math.abs(hi));
  for (let i = 0; i < 120; i += 1) {
    const mid = 0.5 * (lo + hi);
    if (noncentralTCdf(mid, df, delta) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}
