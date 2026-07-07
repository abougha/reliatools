// Pure, framework-agnostic reliability math for the FIT Calculator.
// Model: constant failure rate (exponential) unless noted.
// FIT = failures per 1e9 device-hours.  lambda [1/h] = FIT * 1e-9.

export type KnownField = "fit" | "lambda" | "reliability" | "ppm" | "mttf";

export interface ConverterInput {
  known: KnownField;
  value: number;        // interpreted per `known`: FIT, lambda[1/h], reliability fraction(0-1), ppm, or MTTF[h]
  missionHours: number; // t
  fleetSize: number;    // N
}

export interface ConverterResult {
  lambda: number;                // 1/h
  fit: number;                   // failures / 1e9 h
  mttf: number;                  // h (Infinity if lambda = 0)
  reliability: number;           // R over mission (0-1)
  failureProb: number;           // F over mission (0-1)
  ppm: number;                   // F * 1e6
  expectedFleetFailures: number; // N * F
  nines: number;                 // -log10(F); Infinity if F = 0
}

// 1 - e^x, numerically accurate for small |x|
const oneMinusExp = (x: number) => -Math.expm1(x);

export function lambdaFromKnown(known: KnownField, value: number, missionHours: number): number {
  switch (known) {
    case "fit":
      return value * 1e-9;
    case "lambda":
      return value;
    case "mttf":
      return value > 0 ? 1 / value : Infinity;
    case "reliability": {
      if (value >= 1) return 0;        // R = 1 -> lambda = 0
      if (value <= 0) return Infinity; // R = 0 -> certain failure
      return -Math.log(value) / missionHours;
    }
    case "ppm": {
      const F = value / 1e6;
      if (F <= 0) return 0;
      if (F >= 1) return Infinity;
      return -Math.log1p(-F) / missionHours; // -ln(1-F)/t
    }
    default:
      return NaN;
  }
}

export function convert(input: ConverterInput): ConverterResult {
  const { known, value, missionHours, fleetSize } = input;
  const lambda = lambdaFromKnown(known, value, missionHours);
  const lt = lambda * missionHours;

  const reliability = lambda === Infinity ? 0 : Math.exp(-lt);
  const failureProb = lambda === Infinity ? 1 : oneMinusExp(-lt); // 1 - e^{-lt}
  const ppm = failureProb * 1e6;
  const mttf = lambda === 0 ? Infinity : 1 / lambda;
  const fit = lambda * 1e9;
  const expectedFleetFailures = fleetSize * failureProb;
  const nines = failureProb <= 0 ? Infinity : -Math.log10(failureProb);

  return { lambda, fit, mttf, reliability, failureProb, ppm, expectedFleetFailures, nines };
}

// ---------- Module 2: Test evidence ----------

export interface EvidenceInput {
  targetFit: number;           // FIT
  confidence: number;          // 0-1
  units: number;               // n
  hoursPerUnit: number;        // h
  accelerationFactor: number;  // AF
  failures: number;            // r, integer >= 0
}

export interface EvidenceResult {
  equivHours: number;           // T_equiv = n*h*AF
  chiHalf: number;              // m = chi2(C, 2r+2)/2
  demonstratedFit: number;      // upper-bound FIT at confidence C
  requiredEquivHours: number;   // to demonstrate target at C with r failures
  requiredUnits: number;        // ceil, at current hoursPerUnit & AF
  requiredHoursPerUnit: number; // at current unit count & AF
  shortfallFactor: number;      // demonstratedFit / targetFit  (>1 = insufficient)
  pass: boolean;
}

// P(X <= r) for Poisson(mean = m)
export function poissonCdf(r: number, m: number): number {
  let term = Math.exp(-m); // k = 0
  let sum = term;
  for (let k = 1; k <= r; k++) {
    term *= m / k;
    sum += term;
  }
  return sum;
}

// m = chi2(C, 2r+2)/2 : Poisson mean with P(X <= r) = 1 - C  (time-terminated upper bound).
// poissonCdf is monotonically decreasing in m for fixed r, so bisection is stable.
export function chiSqUpperMean(confidence: number, r: number): number {
  const target = 1 - confidence; // small positive
  let lo = 0;
  let hi = Math.max(1, r + 1);
  while (poissonCdf(r, hi) > target) hi *= 2; // expand until cdf < target
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (poissonCdf(r, mid) > target) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

export function evidenceCheck(input: EvidenceInput): EvidenceResult {
  const { targetFit, confidence, units, hoursPerUnit, accelerationFactor, failures } = input;

  const equivHours = units * hoursPerUnit * accelerationFactor;
  const m = chiSqUpperMean(confidence, failures);
  const lambdaTarget = targetFit * 1e-9;

  const demonstratedLambda = equivHours > 0 ? m / equivHours : Infinity;
  const demonstratedFit = demonstratedLambda * 1e9;

  const requiredEquivHours = m / lambdaTarget;
  const requiredUnits = Math.ceil(requiredEquivHours / (hoursPerUnit * accelerationFactor));
  const requiredHoursPerUnit = requiredEquivHours / (units * accelerationFactor);

  const shortfallFactor = demonstratedFit / targetFit;
  const pass = equivHours >= requiredEquivHours;

  return {
    equivHours, chiHalf: m, demonstratedFit,
    requiredEquivHours, requiredUnits, requiredHoursPerUnit,
    shortfallFactor, pass,
  };
}
