import { kB_eV } from "./constants";
import {
  chi2Inv,
  noncentralTCdf,
  noncentralTQuantile,
  normalQuantile,
  studentTQuantile,
} from "./specialFunctions";
import { toKelvinFromCelsius } from "./units";
import { inRange, requireFinite } from "./validation";

const LOG_FACTORIAL_CACHE: number[] = [0];

function logFactorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("n must be a non-negative integer.");
  }
  if (LOG_FACTORIAL_CACHE[n] !== undefined) {
    return LOG_FACTORIAL_CACHE[n];
  }
  let value = LOG_FACTORIAL_CACHE[LOG_FACTORIAL_CACHE.length - 1];
  for (let i = LOG_FACTORIAL_CACHE.length; i <= n; i += 1) {
    value += Math.log(i);
    LOG_FACTORIAL_CACHE[i] = value;
  }
  return LOG_FACTORIAL_CACHE[n];
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) {
    return Number.NEGATIVE_INFINITY;
  }
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

function logSumExp(values: number[]): number {
  const max = Math.max(...values);
  if (!Number.isFinite(max)) {
    return Number.NEGATIVE_INFINITY;
  }
  const sum = values.reduce((acc, value) => acc + Math.exp(value - max), 0);
  return max + Math.log(sum);
}

export function computeArrheniusAF(EaEV: number, useTempC: number, stressTempC: number): number {
  requireFinite("Ea (eV)", EaEV);
  requireFinite("Use temperature (C)", useTempC);
  requireFinite("Stress temperature (C)", stressTempC);
  inRange("Ea (eV)", EaEV, 0.000001, 100);

  const tUseK = toKelvinFromCelsius(useTempC);
  const tStressK = toKelvinFromCelsius(stressTempC);
  if (tUseK <= 0 || tStressK <= 0) {
    throw new Error("Temperatures must be above absolute zero.");
  }
  return Math.exp((EaEV / kB_eV) * (1 / tUseK - 1 / tStressK));
}

export function computeCoffinMansonCyclesToFailure(A: number, c: number, deltaEpsilon: number): number {
  requireFinite("A", A);
  requireFinite("c", c);
  requireFinite("Delta strain", deltaEpsilon);
  inRange("A", A, 0.0000001, Number.MAX_SAFE_INTEGER);
  inRange("Delta strain", deltaEpsilon, 0.0000001, 1);

  const cPositive = Math.abs(c);
  return A * Math.pow(deltaEpsilon, -cPositive);
}

export function computeElectromigrationMTTF(
  A: number,
  currentDensity: number,
  n: number,
  EaEV: number,
  temperatureC: number
): number {
  requireFinite("A", A);
  requireFinite("Current density", currentDensity);
  requireFinite("n", n);
  requireFinite("Ea (eV)", EaEV);
  requireFinite("Temperature (C)", temperatureC);
  inRange("A", A, 0.0000001, Number.MAX_SAFE_INTEGER);
  inRange("Current density", currentDensity, 0.0000001, Number.MAX_SAFE_INTEGER);
  inRange("Ea (eV)", EaEV, 0.0000001, 100);

  const nPositive = Math.abs(n);
  const tK = toKelvinFromCelsius(temperatureC);
  if (tK <= 0) {
    throw new Error("Temperature must be above absolute zero.");
  }
  return A * Math.pow(currentDensity, -nPositive) * Math.exp(EaEV / (kB_eV * tK));
}

export function binomialAcceptanceProbability(n: number, f: number, reliability: number): number {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("n must be a positive integer.");
  }
  if (!Number.isInteger(f) || f < 0) {
    throw new Error("f must be a non-negative integer.");
  }
  if (f >= n) {
    throw new Error("f must be less than n.");
  }
  inRange("Reliability", reliability, 0, 1);

  if (reliability === 1) {
    return 1;
  }
  if (reliability === 0) {
    return f >= n ? 1 : 0;
  }

  const pFail = 1 - reliability;
  const terms: number[] = [];
  for (let i = 0; i <= f; i += 1) {
    const logTerm = logChoose(n, i) + i * Math.log(pFail) + (n - i) * Math.log(reliability);
    terms.push(logTerm);
  }
  return Math.exp(logSumExp(terms));
}

export function confidenceFromAcceptance(acceptanceProbability: number): number {
  return 1 - acceptanceProbability;
}

export function solveSampleSizeForConfidence(
  f: number,
  reliability: number,
  confidenceLevel: number,
  maxN = 5000
): { n: number; nReal: number } {
  if (!Number.isInteger(f) || f < 0) {
    throw new Error("f must be a non-negative integer.");
  }
  inRange("Reliability", reliability, 0.0000001, 0.9999999);
  inRange("Confidence level", confidenceLevel, 0.0000001, 0.9999999);

  const targetAcceptance = 1 - confidenceLevel;

  if (f === 0) {
    const nReal = Math.log(targetAcceptance) / Math.log(reliability);
    return { n: Math.ceil(nReal), nReal };
  }

  let n = Math.max(1, f + 1);
  while (n <= maxN) {
    const acceptance = binomialAcceptanceProbability(n, f, reliability);
    if (acceptance <= targetAcceptance) {
      return { n, nReal: n };
    }
    n += 1;
  }
  throw new Error(`No sample size found up to n=${maxN}.`);
}

export function solveReliabilityFromBinomial(
  n: number,
  f: number,
  confidenceLevel: number,
  maxIterations = 80
): number {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("n must be a positive integer.");
  }
  if (!Number.isInteger(f) || f < 0) {
    throw new Error("f must be a non-negative integer.");
  }
  if (f >= n) {
    throw new Error("f must be less than n.");
  }
  inRange("Confidence level", confidenceLevel, 0.0000001, 0.9999999);

  const targetAcceptance = 1 - confidenceLevel;

  if (f === 0) {
    return Math.pow(targetAcceptance, 1 / n);
  }

  let low = Number.EPSILON;
  let high = 1 - Number.EPSILON;

  let lowValue = binomialAcceptanceProbability(n, f, low) - targetAcceptance;
  let highValue = binomialAcceptanceProbability(n, f, high) - targetAcceptance;

  if (!(lowValue <= 0 && highValue >= 0)) {
    throw new Error("No valid reliability root found in (0, 1).");
  }

  for (let i = 0; i < maxIterations; i += 1) {
    const mid = (low + high) / 2;
    const midValue = binomialAcceptanceProbability(n, f, mid) - targetAcceptance;

    if (Math.abs(midValue) < 1e-12) {
      return mid;
    }

    if (midValue > 0) {
      high = mid;
      highValue = midValue;
    } else {
      low = mid;
      lowValue = midValue;
    }
  }

  return (low + high) / 2;
}

function binomialCoeff(n: number, k: number): number {
  return Math.round(Math.exp(logChoose(n, k)));
}

export function computeRbdNodeReliability(
  type: "Block" | "Series" | "Parallel" | "KofN",
  reliability: number | undefined,
  childReliabilities: number[],
  kRequired?: number
): number {
  if (type === "Block") {
    if (reliability === undefined || !Number.isFinite(reliability)) {
      throw new Error("Block reliability is required.");
    }
    return reliability;
  }
  if (type === "Series") {
    if (childReliabilities.length === 0) {
      return 1;
    }
    return childReliabilities.reduce((product, item) => product * item, 1);
  }
  if (type === "KofN") {
    const n = childReliabilities.length;
    if (kRequired === undefined || kRequired <= 0 || kRequired > n) throw new Error("k must be between 1 and n.");
    if (childReliabilities.some((cr) => Math.abs(cr - childReliabilities[0]) > 1e-10)) {
      throw new Error("KofN requires children with equal Block reliability.");
    }
    const r = childReliabilities[0];
    let sum = 0;
    for (let i = kRequired; i <= n; i++) {
      sum += binomialCoeff(n, i) * Math.pow(r, i) * Math.pow(1 - r, n - i);
    }
    return sum;
  }
  // Parallel
  if (childReliabilities.length === 0) {
    return 0;
  }
  const failureProduct = childReliabilities.reduce((product, item) => product * (1 - item), 1);
  return 1 - failureProduct;
}

// ---------------------------------------------------------------------------
// Sample size planning: extended bogey, MTBF demonstration, tolerance intervals,
// comparative testing, Weibayes, and HASS lot sampling.
//
// Note on chi-square notation. Reliability texts write the MTBF multiplier as
// "chi2(1-C, 2r+2)/2" using the UPPER-tail convention, and the Howe tolerance
// factor as "chi2(1-C, v)" using the LOWER-tail convention. The same symbol,
// two meanings. chi2Inv() here is strictly lower-tail, so the MTBF path passes
// C and the Howe path passes 1-C. Both are pinned by test vectors.
// ---------------------------------------------------------------------------

export interface ExtendedBogeyResult {
  n: number;
  nReal: number;
  /** beta <= 1 means testing longer buys almost nothing; the UI must say so. */
  longerTestHelpsLittle: boolean;
}

/**
 * Extended bogey (Weibull "test longer instead of wider"):
 *   n = ln(1-C) / [ (t/T)^beta * ln(R) ]
 */
export function extendedBogeySampleSize(
  reliability: number,
  confidenceLevel: number,
  beta: number,
  lifeMultiple: number
): ExtendedBogeyResult {
  inRange("Reliability", reliability, 0.0000001, 0.9999999);
  inRange("Confidence level", confidenceLevel, 0.0000001, 0.9999999);
  requireFinite("Weibull beta", beta);
  requireFinite("Test duration (t/T)", lifeMultiple);
  if (beta <= 0) throw new Error("Weibull beta must be greater than 0.");
  if (lifeMultiple <= 0) throw new Error("Test duration (t/T) must be greater than 0.");

  const nReal = Math.log(1 - confidenceLevel) / (Math.pow(lifeMultiple, beta) * Math.log(reliability));
  return { n: Math.ceil(nReal), nReal, longerTestHelpsLittle: beta <= 1 };
}

/**
 * Chi-square multiplier for a time-terminated MTBF demonstration:
 *   m = chi2(1-C, 2r+2) / 2   (upper-tail notation) = chi2Inv(C, 2r+2) / 2.
 *
 * lib/fitpmhf.ts reaches the same value by bisecting the Poisson CDF; that route
 * only covers even df, so this one is used wherever df may be odd.
 */
export function mtbfChiSquareMultiplier(confidenceLevel: number, failures: number): number {
  inRange("Confidence level", confidenceLevel, 0.0000001, 0.9999999);
  if (!Number.isInteger(failures) || failures < 0) {
    throw new Error("Allowed failures must be a non-negative integer.");
  }
  return chi2Inv(confidenceLevel, 2 * failures + 2) / 2;
}

export interface MtbfDemonstrationResult {
  multiplier: number;
  totalTestTime: number;
}

/** Total test time to demonstrate an MTBF at confidence C allowing r failures. */
export function mtbfDemonstrationTime(
  requiredMtbf: number,
  confidenceLevel: number,
  failures: number
): MtbfDemonstrationResult {
  requireFinite("Required MTBF", requiredMtbf);
  if (requiredMtbf <= 0) throw new Error("Required MTBF must be greater than 0.");
  const multiplier = mtbfChiSquareMultiplier(confidenceLevel, failures);
  return { multiplier, totalTestTime: requiredMtbf * multiplier };
}

/**
 * Exact one-sided tolerance factor via the noncentral t:
 *   k = t'_{n-1, delta}(C) / sqrt(n),  delta = z_P * sqrt(n)
 * Assumes normality.
 */
export function toleranceFactorOneSided(n: number, coverage: number, confidenceLevel: number): number {
  if (!Number.isInteger(n) || n < 2) throw new Error("Sample size must be an integer of at least 2.");
  inRange("Coverage", coverage, 0.0000001, 0.9999999);
  inRange("Confidence level", confidenceLevel, 0.0000001, 0.9999999);

  const delta = normalQuantile(coverage) * Math.sqrt(n);
  return noncentralTQuantile(confidenceLevel, n - 1, delta) / Math.sqrt(n);
}

/**
 * Two-sided tolerance factor, Howe approximation:
 *   k = z_((1+P)/2) * sqrt( v(1 + 1/n) / chi2(1-C, v) ),  v = n - 1
 * Approximate by construction (unlike the one-sided factor above).
 */
export function toleranceFactorTwoSided(n: number, coverage: number, confidenceLevel: number): number {
  if (!Number.isInteger(n) || n < 2) throw new Error("Sample size must be an integer of at least 2.");
  inRange("Coverage", coverage, 0.0000001, 0.9999999);
  inRange("Confidence level", confidenceLevel, 0.0000001, 0.9999999);

  const v = n - 1;
  const z = normalQuantile((1 + coverage) / 2);
  return z * Math.sqrt((v * (1 + 1 / n)) / chi2Inv(1 - confidenceLevel, v));
}

/** Exact power of a two-sample t-test with n per arm (noncentral t, not the normal approximation). */
export function twoSampleTPower(effectSizeD: number, n: number, alpha: number, twoSided = true): number {
  if (!Number.isInteger(n) || n < 2) throw new Error("Sample size per arm must be an integer of at least 2.");
  inRange("Alpha", alpha, 0.0000001, 0.9999999);
  requireFinite("Effect size", effectSizeD);

  const df = 2 * n - 2;
  const delta = Math.abs(effectSizeD) * Math.sqrt(n / 2);

  if (!twoSided) {
    return 1 - noncentralTCdf(studentTQuantile(1 - alpha, df), df, delta);
  }
  const tCrit = studentTQuantile(1 - alpha / 2, df);
  return 1 - noncentralTCdf(tCrit, df, delta) + noncentralTCdf(-tCrit, df, delta);
}

export interface TwoSampleTSizeResult {
  nPerArm: number;
  achievedPower: number;
}

/** Smallest n per arm reaching the target power. Uses the exact noncentral-t power above. */
export function twoSampleTSampleSize(
  effectSizeD: number,
  alpha: number,
  targetPower: number,
  twoSided = true,
  maxN = 100000
): TwoSampleTSizeResult {
  requireFinite("Effect size", effectSizeD);
  inRange("Alpha", alpha, 0.0000001, 0.9999999);
  inRange("Target power", targetPower, 0.0000001, 0.9999999);
  if (effectSizeD === 0) throw new Error("Effect size must be non-zero.");

  // Normal approximation as a starting point; it underestimates n, so scan upward.
  const zAlpha = normalQuantile(1 - (twoSided ? alpha / 2 : alpha));
  const zBeta = normalQuantile(targetPower);
  const approx = (2 * Math.pow(zAlpha + zBeta, 2)) / Math.pow(effectSizeD, 2);
  let n = Math.max(2, Math.floor(approx) - 5);

  // Guard against the approximation overshooting on large effect sizes.
  while (n > 2 && twoSampleTPower(effectSizeD, n - 1, alpha, twoSided) >= targetPower) {
    n -= 1;
  }
  for (; n <= maxN; n += 1) {
    const power = twoSampleTPower(effectSizeD, n, alpha, twoSided);
    if (power >= targetPower) {
      return { nPerArm: n, achievedPower: power };
    }
  }
  throw new Error(`No sample size found up to n=${maxN} per arm.`);
}

export interface WeibayesInput {
  /** Target reliability at one life T. */
  reliability: number;
  confidenceLevel: number;
  beta: number;
  /** Failures already observed in the prior evidence. */
  priorFailures: number;
  priorUnits: number;
  /** Duration each prior unit accumulated, as a multiple of one life. */
  priorLifeMultiple: number;
  /** 0..1 discount on the prior. 1 = same design, ~0.5 = same family, ~0.25 = analogous only. */
  priorCreditFactor: number;
  /** Planned duration per new unit, as a multiple of one life. */
  testLifeMultiple: number;
}

export interface WeibayesResult {
  /** Required accumulated damage sum(t_i^beta) in units of T^beta. */
  requiredDamage: number;
  priorDamage: number;
  creditedPriorDamage: number;
  remainingDamage: number;
  unitsRequired: number;
  /** What the same claim costs with no prior credit at all — the price of the assumption. */
  unitsWithoutPrior: number;
  priorSatisfiesClaim: boolean;
}

/**
 * Weibayes with prior credit.
 *
 * Required damage D_req = [chi2(1-C, 2r+2)/2] / (-ln R), in units of one life^beta.
 * At r = 0 this collapses to ln(1-C)/ln(R), i.e. exactly the extended-bogey
 * requirement, so the two methods stay consistent with each other.
 *
 * Judgment-heavy: the answer is only as defensible as the claim that the prior
 * design is comparable, which is what priorCreditFactor exists to expose.
 */
export function weibayesRemainingTest(input: WeibayesInput): WeibayesResult {
  const {
    reliability,
    confidenceLevel,
    beta,
    priorFailures,
    priorUnits,
    priorLifeMultiple,
    priorCreditFactor,
    testLifeMultiple,
  } = input;

  inRange("Reliability", reliability, 0.0000001, 0.9999999);
  inRange("Confidence level", confidenceLevel, 0.0000001, 0.9999999);
  inRange("Prior credit factor", priorCreditFactor, 0, 1);
  requireFinite("Weibull beta", beta);
  if (beta <= 0) throw new Error("Weibull beta must be greater than 0.");
  if (priorUnits < 0) throw new Error("Prior units must not be negative.");
  if (priorLifeMultiple < 0) throw new Error("Prior duration (t/T) must not be negative.");
  if (testLifeMultiple <= 0) throw new Error("Test duration (t/T) must be greater than 0.");

  const requiredDamage = mtbfChiSquareMultiplier(confidenceLevel, priorFailures) / -Math.log(reliability);
  const priorDamage = priorUnits * Math.pow(priorLifeMultiple, beta);
  const creditedPriorDamage = priorCreditFactor * priorDamage;
  const remainingDamage = Math.max(0, requiredDamage - creditedPriorDamage);
  const perUnitDamage = Math.pow(testLifeMultiple, beta);

  return {
    requiredDamage,
    priorDamage,
    creditedPriorDamage,
    remainingDamage,
    unitsRequired: Math.ceil(remainingDamage / perUnitDamage),
    unitsWithoutPrior: Math.ceil(requiredDamage / perUnitDamage),
    priorSatisfiesClaim: remainingDamage <= 0,
  };
}

export interface LotSampleResult {
  n: number;
  defectsAssumed: number;
  detectionProbability: number;
  /** True when the target can only be met by screening the whole lot. */
  requiresFullScreen: boolean;
}

/**
 * HASS lot sampling. Smallest n drawn from a lot of N that catches at least one
 * defective with probability >= confidence, when the lot sits at the target
 * escape rate. Hypergeometric (finite lot, sampling without replacement):
 *   P(detect) = 1 - C(N-D, n) / C(N, n),  D = ceil(escapeRate * N)
 *
 * Screen strength is deliberately absent: nothing published maps HALT destruct
 * margin onto a detection efficiency, so it drives the safeguard warning only.
 */
export function hassLotSampleSize(lotSize: number, escapeRate: number, confidenceLevel: number): LotSampleResult {
  if (!Number.isInteger(lotSize) || lotSize <= 0) throw new Error("Lot size must be a positive integer.");
  inRange("Escape rate", escapeRate, 0.0000001, 1);
  inRange("Confidence level", confidenceLevel, 0.0000001, 0.9999999);

  const defectsAssumed = Math.max(1, Math.ceil(escapeRate * lotSize));
  const good = lotSize - defectsAssumed;

  for (let n = 1; n <= lotSize; n += 1) {
    const missProbability = n > good ? 0 : Math.exp(logChoose(good, n) - logChoose(lotSize, n));
    const detectionProbability = 1 - missProbability;
    if (detectionProbability >= confidenceLevel) {
      return { n, defectsAssumed, detectionProbability, requiresFullScreen: n >= lotSize };
    }
  }

  return { n: lotSize, defectsAssumed, detectionProbability: 1, requiresFullScreen: true };
}
