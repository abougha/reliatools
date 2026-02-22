import { kB_eV } from "./constants";
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

export function computeRbdNodeReliability(
  type: "Block" | "Series" | "Parallel",
  reliability: number | undefined,
  childReliabilities: number[]
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
  if (childReliabilities.length === 0) {
    return 0;
  }
  const failureProduct = childReliabilities.reduce((product, item) => product * (1 - item), 1);
  return 1 - failureProduct;
}
