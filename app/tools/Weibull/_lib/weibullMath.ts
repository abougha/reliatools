export type Status = "FAIL" | "SUSP";

export type DataPoint = {
  id?: string;
  t: number;
  status: Status;
  mode?: string;
};

export type FitMethod = "REGRESSION" | "MLE";
export type WeibullModel = "WEIBULL_2P";

export type ParamBounds = {
  lower: number;
  upper: number;
};

export type BandPoint = {
  percent: number;
  t: number;
  tLower?: number;
  tUpper?: number;
};

export type FitBounds = {
  confidenceLevel: number;
  z: number;
  approximate: boolean;
  beta?: ParamBounds;
  eta?: ParamBounds;
  b1?: ParamBounds;
  b10?: ParamBounds;
  b50?: ParamBounds;
  rMission?: ParamBounds;
  band: BandPoint[];
};

export type FitResult = {
  beta: number;
  eta: number;
  method: FitMethod;
  nTotal: number;
  nFail: number;
  nSusp: number;
  b1: number;
  b10: number;
  b50: number;
  b632: number;
  mttf: number;
  tMission?: number;
  rMission?: number;
  fMission?: number;
  plotPoints: Array<{
    t: number;
    x: number;
    F_plot?: number;
    y_plot?: number;
    status: Status;
  }>;
  curve: Array<{ x: number; y: number }>;
  r2?: number;
  bounds?: FitBounds;
};

export type FitOutput = {
  fit?: FitResult;
  warnings: string[];
  error?: string;
};

type RegressionResult = {
  a: number;
  b: number;
  r2: number;
};

const MIN_PROB = 1e-12;
const MAX_PROB = 1 - MIN_PROB;
const LARGE_PENALTY = 1e30;

const lanczosCoefficients = [
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

export function gamma(z: number): number {
  if (!Number.isFinite(z)) return NaN;
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }

  const zShifted = z - 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < lanczosCoefficients.length; i += 1) {
    x += lanczosCoefficients[i] / (zShifted + i + 1);
  }
  const t = zShifted + lanczosCoefficients.length - 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, zShifted + 0.5) * Math.exp(-t) * x;
}

const ACKLAM_A = [
  -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1,
  2.506628277459239e0,
];
const ACKLAM_B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
const ACKLAM_C = [
  -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0,
  2.938163982698783e0,
];
const ACKLAM_D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];

/** Acklam/Wichura rational approximation of the standard normal inverse CDF (~1e-9 accurate). */
export function inverseNormalCdf(p: number): number {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return NaN;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
      ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1)
    );
  }

  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((ACKLAM_A[0] * r + ACKLAM_A[1]) * r + ACKLAM_A[2]) * r + ACKLAM_A[3]) * r + ACKLAM_A[4]) * r + ACKLAM_A[5]) * q) /
      (((((ACKLAM_B[0] * r + ACKLAM_B[1]) * r + ACKLAM_B[2]) * r + ACKLAM_B[3]) * r + ACKLAM_B[4]) * r + 1)
    );
  }

  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
    ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1)
  );
}

function zForConfidenceLevel(confidenceLevelPercent: number): number {
  const clamped = Math.min(99.99, Math.max(1, confidenceLevelPercent));
  return inverseNormalCdf(1 - (1 - clamped / 100) / 2);
}

function clampProbability(p: number): number {
  if (!Number.isFinite(p)) return MIN_PROB;
  return Math.min(MAX_PROB, Math.max(MIN_PROB, p));
}

export function weibullX(t: number): number {
  return Math.log(t);
}

export function weibullY(F: number): number {
  const clamped = clampProbability(F);
  return Math.log(-Math.log(1 - clamped));
}

export function weibullYInverse(y: number): number {
  if (!Number.isFinite(y)) return NaN;
  return 1 - Math.exp(-Math.exp(y));
}

export function weibullCdf(t: number, beta: number, eta: number): number {
  if (t <= 0 || beta <= 0 || eta <= 0) return NaN;
  const z = Math.pow(t / eta, beta);
  return 1 - Math.exp(-z);
}

export function weibullReliability(t: number, beta: number, eta: number): number {
  if (t <= 0 || beta <= 0 || eta <= 0) return NaN;
  const z = Math.pow(t / eta, beta);
  return Math.exp(-z);
}

export function weibullPdf(t: number, beta: number, eta: number): number {
  if (t <= 0 || beta <= 0 || eta <= 0) return NaN;
  const ratio = t / eta;
  const z = Math.pow(ratio, beta);
  return (beta / eta) * Math.pow(ratio, beta - 1) * Math.exp(-z);
}

export function weibullBQuantile(beta: number, eta: number, x: number): number {
  if (beta <= 0 || eta <= 0 || x <= 0 || x >= 1) return NaN;
  return eta * Math.pow(-Math.log(1 - x), 1 / beta);
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function chooseDefaultMethod(data: DataPoint[]): FitMethod {
  return data.some((point) => point.status === "SUSP") ? "MLE" : "REGRESSION";
}

function linearRegression(points: Array<{ x: number; y: number }>): RegressionResult | null {
  if (points.length < 2) return null;

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXX += point.x * point.x;
    sumXY += point.x * point.y;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const b = (n * sumXY - sumX * sumY) / denominator;
  const a = (sumY - b * sumX) / n;

  const meanY = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (const point of points) {
    const yHat = a + b * point.x;
    ssRes += (point.y - yHat) ** 2;
    ssTot += (point.y - meanY) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  return { a, b, r2 };
}

export function buildPlotPoints(data: DataPoint[]): FitResult["plotPoints"] {
  const sorted = [...data].sort((a, b) => {
    if (a.t !== b.t) return a.t - b.t;
    if (a.status === b.status) return 0;
    return a.status === "SUSP" ? -1 : 1;
  });
  const nTotal = sorted.length;
  let prevAdjustedRank = 0;

  return sorted.map((point, i) => {
    const x = weibullX(point.t);
    if (point.status === "FAIL") {
      const increment = (nTotal + 1 - prevAdjustedRank) / (1 + (nTotal - i));
      const adjustedRank = prevAdjustedRank + increment;
      prevAdjustedRank = adjustedRank;
      const fPlot = clampProbability((adjustedRank - 0.3) / (nTotal + 0.4));
      return {
        t: point.t,
        x,
        F_plot: fPlot,
        y_plot: weibullY(fPlot),
        status: point.status,
      };
    }
    return {
      t: point.t,
      x,
      status: point.status,
    };
  });
}

function timeDomain(data: DataPoint[]): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const point of data) {
    min = Math.min(min, point.t);
    max = Math.max(max, point.t);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 1, max: 10 };
  }
  if (min === max) {
    return { min: min * 0.5, max: max * 1.5 };
  }
  return { min, max };
}

export function buildCurve(beta: number, eta: number, data: DataPoint[]): Array<{ x: number; y: number }> {
  const domain = timeDomain(data);
  const n = 100;
  const logMin = Math.log(domain.min);
  const logMax = Math.log(domain.max);
  const span = logMax - logMin;

  const curve: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i += 1) {
    const fraction = i / (n - 1);
    const x = logMin + span * fraction;
    const t = Math.exp(x);
    const f = weibullCdf(t, beta, eta);
    curve.push({ x, y: weibullY(f) });
  }
  return curve;
}

const DEFAULT_CONFIDENCE_LEVEL = 90;

function makeFitResult(
  beta: number,
  eta: number,
  method: FitMethod,
  data: DataPoint[],
  plotPoints: FitResult["plotPoints"],
  tMission?: number,
  r2?: number,
  confidenceLevel?: number,
): { fit: FitResult; warning?: string } {
  const nTotal = data.length;
  const nFail = data.filter((point) => point.status === "FAIL").length;
  const nSusp = nTotal - nFail;
  const missionIsValid = Number.isFinite(tMission) && (tMission as number) > 0;

  const fMission = missionIsValid ? weibullCdf(tMission as number, beta, eta) : undefined;
  const rMission = missionIsValid ? weibullReliability(tMission as number, beta, eta) : undefined;

  const { bounds, warning } = computeFisherBounds(
    beta,
    eta,
    data,
    method,
    confidenceLevel ?? DEFAULT_CONFIDENCE_LEVEL,
    missionIsValid ? (tMission as number) : undefined,
  );

  return {
    fit: {
      beta,
      eta,
      method,
      nTotal,
      nFail,
      nSusp,
      b1: weibullBQuantile(beta, eta, 0.01),
      b10: weibullBQuantile(beta, eta, 0.1),
      b50: weibullBQuantile(beta, eta, 0.5),
      b632: eta,
      mttf: eta * gamma(1 + 1 / beta),
      tMission: missionIsValid ? tMission : undefined,
      rMission,
      fMission,
      plotPoints,
      curve: buildCurve(beta, eta, data),
      r2,
      bounds,
    },
    warning,
  };
}

function fitRegression(data: DataPoint[], tMission?: number, confidenceLevel?: number): FitOutput {
  const plotPoints = buildPlotPoints(data);
  const failPoints = plotPoints
    .filter((point) => point.status === "FAIL" && point.y_plot !== undefined)
    .map((point) => ({ x: point.x, y: point.y_plot as number }));

  const regression = linearRegression(failPoints);
  if (!regression) {
    return {
      warnings: [],
      error: "Regression requires at least two failures with distinct times.",
    };
  }

  const beta = regression.b;
  const eta = Math.exp(-regression.a / regression.b);
  if (!Number.isFinite(beta) || !Number.isFinite(eta) || beta <= 0 || eta <= 0) {
    return {
      warnings: [],
      error: "Regression produced non-physical parameters. Try MLE.",
    };
  }

  const { fit, warning } = makeFitResult(beta, eta, "REGRESSION", data, plotPoints, tMission, regression.r2, confidenceLevel);

  return {
    warnings: warning ? [warning] : [],
    fit,
  };
}

function negLogLikelihood(beta: number, eta: number, data: DataPoint[]): number {
  if (!Number.isFinite(beta) || !Number.isFinite(eta) || beta <= 0 || eta <= 0) {
    return LARGE_PENALTY;
  }

  let nll = 0;
  for (const point of data) {
    if (point.t <= 0 || !Number.isFinite(point.t)) return LARGE_PENALTY;

    const logRatio = Math.log(point.t / eta);
    const z = Math.exp(beta * logRatio);
    if (!Number.isFinite(z)) return LARGE_PENALTY;

    if (point.status === "FAIL") {
      const logPdf = Math.log(beta / eta) + (beta - 1) * logRatio - z;
      if (!Number.isFinite(logPdf)) return LARGE_PENALTY;
      nll -= logPdf;
    } else {
      const logReliability = -z;
      nll -= logReliability;
    }
  }
  return nll;
}

type Matrix2x2 = [[number, number], [number, number]];

function fisherInformation(beta: number, eta: number, data: DataPoint[]): Matrix2x2 {
  const hBeta = 1e-4 * beta;
  const hEta = 1e-4 * eta;
  const f = (b: number, e: number) => negLogLikelihood(b, e, data);

  const f00 = f(beta, eta);
  const d2Beta2 = (f(beta + hBeta, eta) - 2 * f00 + f(beta - hBeta, eta)) / (hBeta * hBeta);
  const d2Eta2 = (f(beta, eta + hEta) - 2 * f00 + f(beta, eta - hEta)) / (hEta * hEta);
  const d2BetaEta =
    (f(beta + hBeta, eta + hEta) - f(beta + hBeta, eta - hEta) - f(beta - hBeta, eta + hEta) + f(beta - hBeta, eta - hEta)) /
    (4 * hBeta * hEta);

  return [
    [d2Beta2, d2BetaEta],
    [d2BetaEta, d2Eta2],
  ];
}

function invert2x2(m: Matrix2x2): Matrix2x2 | null {
  const [[a, b], [c, d]] = m;
  const det = a * d - b * c;
  if (!Number.isFinite(det) || det <= 0) return null;
  return [
    [d / det, -b / det],
    [-c / det, a / det],
  ];
}

function paramLogBounds(estimate: number, variance: number, z: number): ParamBounds | undefined {
  if (!Number.isFinite(estimate) || estimate <= 0 || !Number.isFinite(variance) || variance < 0) return undefined;
  const se = Math.sqrt(variance) / estimate;
  if (!Number.isFinite(se)) return undefined;
  return { lower: estimate * Math.exp(-z * se), upper: estimate * Math.exp(z * se) };
}

function lnQuantileVariance(beta: number, eta: number, varBeta: number, varEta: number, covBetaEta: number, p: number): number {
  const w = Math.log(-Math.log(1 - p));
  const g0 = -w / (beta * beta);
  const g1 = 1 / eta;
  return g0 * g0 * varBeta + 2 * g0 * g1 * covBetaEta + g1 * g1 * varEta;
}

function quantileBounds(
  beta: number,
  eta: number,
  varBeta: number,
  varEta: number,
  covBetaEta: number,
  p: number,
  z: number,
): ParamBounds | undefined {
  const tp = weibullBQuantile(beta, eta, p);
  if (!Number.isFinite(tp) || tp <= 0) return undefined;
  const varLnT = lnQuantileVariance(beta, eta, varBeta, varEta, covBetaEta, p);
  if (!Number.isFinite(varLnT) || varLnT < 0) return undefined;
  const se = Math.sqrt(varLnT);
  return { lower: tp * Math.exp(-z * se), upper: tp * Math.exp(z * se) };
}

function reliabilityBounds(
  beta: number,
  eta: number,
  tMission: number,
  varBeta: number,
  varEta: number,
  covBetaEta: number,
  z: number,
): ParamBounds | undefined {
  if (!(tMission > 0)) return undefined;
  const u = beta * Math.log(tMission / eta);
  const g0 = Math.log(tMission / eta);
  const g1 = -beta / eta;
  const varU = g0 * g0 * varBeta + 2 * g0 * g1 * covBetaEta + g1 * g1 * varEta;
  if (!Number.isFinite(varU) || varU < 0) return undefined;
  const se = Math.sqrt(varU);
  const lower = Math.exp(-Math.exp(u + z * se));
  const upper = Math.exp(-Math.exp(u - z * se));
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return undefined;
  return { lower, upper };
}

function computeFisherBounds(
  beta: number,
  eta: number,
  data: DataPoint[],
  method: FitMethod,
  confidenceLevelPercent: number,
  tMission?: number,
): { bounds?: FitBounds; warning?: string } {
  const information = fisherInformation(beta, eta, data);
  const covariance = invert2x2(information);
  if (!covariance) {
    return { warning: "Confidence bounds unavailable (information matrix not positive definite)." };
  }

  const varBeta = covariance[0][0];
  const varEta = covariance[1][1];
  const covBetaEta = covariance[0][1];
  if (!(varBeta > 0) || !(varEta > 0) || !Number.isFinite(varBeta) || !Number.isFinite(varEta)) {
    return { warning: "Confidence bounds unavailable (information matrix not positive definite)." };
  }

  const z = zForConfidenceLevel(confidenceLevelPercent);

  const band: BandPoint[] = probabilityTicksPercent().map((percent) => {
    const p = percent / 100;
    const t = weibullBQuantile(beta, eta, p);
    const bounds = quantileBounds(beta, eta, varBeta, varEta, covBetaEta, p, z);
    return { percent, t, tLower: bounds?.lower, tUpper: bounds?.upper };
  });

  return {
    bounds: {
      confidenceLevel: confidenceLevelPercent,
      z,
      approximate: method === "REGRESSION",
      beta: paramLogBounds(beta, varBeta, z),
      eta: paramLogBounds(eta, varEta, z),
      b1: quantileBounds(beta, eta, varBeta, varEta, covBetaEta, 0.01, z),
      b10: quantileBounds(beta, eta, varBeta, varEta, covBetaEta, 0.1, z),
      b50: quantileBounds(beta, eta, varBeta, varEta, covBetaEta, 0.5, z),
      rMission: tMission !== undefined ? reliabilityBounds(beta, eta, tMission, varBeta, varEta, covBetaEta, z) : undefined,
      band,
    },
  };
}

type Vertex = {
  x: [number, number];
  f: number;
};

function maxSimplexSpread(simplex: Vertex[]): number {
  const xs = simplex.map((vertex) => vertex.x[0]);
  const ys = simplex.map((vertex) => vertex.x[1]);
  const spreadX = Math.max(...xs) - Math.min(...xs);
  const spreadY = Math.max(...ys) - Math.min(...ys);
  return Math.max(spreadX, spreadY);
}

function nelderMead2D(
  objective: (beta: number, eta: number) => number,
  start: [number, number],
  maxIterations = 500,
  tolerance = 1e-8,
): Vertex {
  const [beta0, eta0] = start;
  const simplex: Vertex[] = [
    { x: [beta0, eta0], f: objective(beta0, eta0) },
    { x: [beta0 * 1.08 + 1e-3, eta0], f: objective(beta0 * 1.08 + 1e-3, eta0) },
    { x: [beta0, eta0 * 1.08 + 1e-3], f: objective(beta0, eta0 * 1.08 + 1e-3) },
  ];

  const alpha = 1;
  const gammaExpand = 2;
  const rho = 0.5;
  const sigma = 0.5;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    simplex.sort((left, right) => left.f - right.f);
    const spread = maxSimplexSpread(simplex);
    const fSpread = Math.abs(simplex[2].f - simplex[0].f);
    if (spread < tolerance && fSpread < tolerance) {
      break;
    }

    const best = simplex[0];
    const second = simplex[1];
    const worst = simplex[2];

    const centroid: [number, number] = [(best.x[0] + second.x[0]) / 2, (best.x[1] + second.x[1]) / 2];

    const reflected: [number, number] = [
      centroid[0] + alpha * (centroid[0] - worst.x[0]),
      centroid[1] + alpha * (centroid[1] - worst.x[1]),
    ];
    const fReflected = objective(reflected[0], reflected[1]);

    if (fReflected < best.f) {
      const expanded: [number, number] = [
        centroid[0] + gammaExpand * (reflected[0] - centroid[0]),
        centroid[1] + gammaExpand * (reflected[1] - centroid[1]),
      ];
      const fExpanded = objective(expanded[0], expanded[1]);
      simplex[2] = fExpanded < fReflected ? { x: expanded, f: fExpanded } : { x: reflected, f: fReflected };
      continue;
    }

    if (fReflected < second.f) {
      simplex[2] = { x: reflected, f: fReflected };
      continue;
    }

    const outsideContraction: [number, number] = [
      centroid[0] + rho * (reflected[0] - centroid[0]),
      centroid[1] + rho * (reflected[1] - centroid[1]),
    ];
    const fOutside = objective(outsideContraction[0], outsideContraction[1]);
    if (fOutside <= fReflected) {
      simplex[2] = { x: outsideContraction, f: fOutside };
      continue;
    }

    const insideContraction: [number, number] = [
      centroid[0] - rho * (centroid[0] - worst.x[0]),
      centroid[1] - rho * (centroid[1] - worst.x[1]),
    ];
    const fInside = objective(insideContraction[0], insideContraction[1]);
    if (fInside < worst.f) {
      simplex[2] = { x: insideContraction, f: fInside };
      continue;
    }

    simplex[1] = {
      x: [best.x[0] + sigma * (simplex[1].x[0] - best.x[0]), best.x[1] + sigma * (simplex[1].x[1] - best.x[1])],
      f: 0,
    };
    simplex[1].f = objective(simplex[1].x[0], simplex[1].x[1]);

    simplex[2] = {
      x: [best.x[0] + sigma * (simplex[2].x[0] - best.x[0]), best.x[1] + sigma * (simplex[2].x[1] - best.x[1])],
      f: 0,
    };
    simplex[2].f = objective(simplex[2].x[0], simplex[2].x[1]);
  }

  simplex.sort((left, right) => left.f - right.f);
  return simplex[0];
}

function regressionSeedFromFailures(data: DataPoint[]): [number, number] | null {
  const failures = data.filter((point) => point.status === "FAIL");
  if (failures.length < 2) return null;
  const output = fitRegression(failures);
  if (!output.fit) return null;
  if (!Number.isFinite(output.fit.beta) || !Number.isFinite(output.fit.eta) || output.fit.beta <= 0 || output.fit.eta <= 0) {
    return null;
  }
  return [output.fit.beta, output.fit.eta];
}

function fitMle(data: DataPoint[], tMission?: number, confidenceLevel?: number): FitOutput {
  const seed = regressionSeedFromFailures(data);
  const times = data.map((point) => point.t).filter((value) => value > 0);
  const medianTime = median(times);

  const initial: [number, number] = seed ?? [1.5, Number.isFinite(medianTime) && medianTime > 0 ? medianTime : Math.max(1, times[0] ?? 1)];
  const best = nelderMead2D((beta, eta) => negLogLikelihood(beta, eta, data), initial, 700, 1e-8);

  if (!Number.isFinite(best.x[0]) || !Number.isFinite(best.x[1]) || best.x[0] <= 0 || best.x[1] <= 0) {
    return {
      warnings: [],
      error: "MLE optimization failed to converge to positive parameters.",
    };
  }

  if (best.x[0] > 50 || best.x[0] < 0.01) {
    return {
      warnings: [],
      error: "MLE did not converge to physically meaningful parameters.",
    };
  }

  const { fit, warning } = makeFitResult(best.x[0], best.x[1], "MLE", data, buildPlotPoints(data), tMission, undefined, confidenceLevel);

  return {
    warnings: warning ? [warning] : [],
    fit,
  };
}

function splitIntoThirds(points: Array<{ x: number; y: number }>): Array<Array<{ x: number; y: number }>> {
  const n = points.length;
  if (n < 6) return [];
  const chunk = Math.floor(n / 3);
  const first = points.slice(0, chunk);
  const second = points.slice(chunk, chunk * 2);
  const third = points.slice(chunk * 2);
  return [first, second, third];
}

function detectDogleg(fit: FitResult): boolean {
  const failurePoints = fit.plotPoints
    .filter((point) => point.status === "FAIL" && point.y_plot !== undefined)
    .map((point) => ({ x: point.x, y: point.y_plot as number }));
  const segments = splitIntoThirds(failurePoints);
  if (segments.length !== 3) return false;

  const slopes: number[] = [];
  for (const segment of segments) {
    const regression = linearRegression(segment);
    if (!regression || !Number.isFinite(regression.b) || regression.b <= 0) {
      return false;
    }
    slopes.push(regression.b);
  }

  const maxSlope = Math.max(...slopes);
  const minSlope = Math.min(...slopes);
  if (minSlope <= 0) return false;
  return maxSlope / minSlope > 1.8;
}

export function classifyBeta(beta: number): string {
  if (!Number.isFinite(beta)) return "Unknown";
  if (beta < 0.95) return "Infant mortality";
  if (beta <= 1.05) return "Random";
  return "Wear-out";
}

function formatThreeSigFigs(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  const rounded = Number(value.toPrecision(3));
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function interpretFit(fit: FitResult, unitsLabel: string): string {
  const category = classifyBeta(fit.beta);
  const betaText = Number.isFinite(fit.beta) ? fit.beta.toFixed(2) : "N/A";

  let modePhrase: string;
  if (category === "Infant mortality") {
    modePhrase = `β = ${betaText} indicates early-life failures dominate — investigate manufacturing or stress screening.`;
  } else if (category === "Random") {
    modePhrase = `β = ${betaText} indicates failures are approximately random in time.`;
  } else if (category === "Wear-out") {
    modePhrase = `β = ${betaText} indicates a wear-out failure mode.`;
  } else {
    modePhrase = `β = ${betaText} — failure mode is undetermined.`;
  }

  const b10Sentence = ` 10% of units are expected to fail by ${formatThreeSigFigs(fit.b10)} ${unitsLabel}.`;

  let missionSentence = "";
  if (fit.tMission !== undefined && fit.rMission !== undefined) {
    missionSentence = ` At the ${formatThreeSigFigs(fit.tMission)} ${unitsLabel} mission, estimated reliability is ${(fit.rMission * 100).toFixed(1)}%.`;
  }

  return `${modePhrase}${b10Sentence}${missionSentence}`;
}

export function fitDataset(data: DataPoint[], method: FitMethod, tMission?: number, confidenceLevel?: number): FitOutput {
  const warnings: string[] = [];
  const cleanData = data.filter((point) => Number.isFinite(point.t) && point.t > 0);

  if (cleanData.length !== data.length) {
    warnings.push("Some rows were dropped due to invalid time values.");
  }

  const nFail = cleanData.filter((point) => point.status === "FAIL").length;
  const nSusp = cleanData.length - nFail;

  if (nFail < 1) {
    return {
      warnings,
      error: "At least one failure is required to fit Weibull parameters.",
    };
  }

  const distinctFailureTimes = new Set(
    cleanData.filter((point) => point.status === "FAIL").map((point) => point.t),
  );
  if (distinctFailureTimes.size < 2) {
    return {
      warnings,
      error:
        "At least two distinct failure times are required to fit both parameters. For a single failure or identical times, a Weibayes approach (fixed beta) is needed — not yet supported.",
    };
  }

  if (nFail < 3) {
    warnings.push("High uncertainty; consider Weibayes mode (future).");
  }

  let output =
    method === "MLE" ? fitMle(cleanData, tMission, confidenceLevel) : fitRegression(cleanData, tMission, confidenceLevel);

  if (method === "REGRESSION" && nSusp > 0) {
    warnings.push("Regression forced with censoring present. Suspensions are not directly fit like MLE.");
  }

  if (!output.fit && method === "REGRESSION" && nFail >= 1) {
    output = fitMle(cleanData, tMission, confidenceLevel);
    warnings.push("Regression could not be solved; fell back to MLE.");
  }

  if (output.fit && output.fit.method === "REGRESSION" && output.fit.nSusp === 0 && detectDogleg(output.fit)) {
    warnings.push("Possible multiple failure modes (dogleg). Consider splitting by failure mode.");
  }

  return {
    fit: output.fit,
    error: output.error,
    warnings: [...warnings, ...output.warnings],
  };
}

export function probabilityTicksPercent(): number[] {
  return [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 30, 50, 70, 80, 90, 95, 98, 99, 99.5, 99.8, 99.9];
}

export function probabilityTickYs(): number[] {
  return probabilityTicksPercent().map((percent) => weibullY(percent / 100));
}

export function formatProbabilityPercentFromY(y: number): string {
  const f = clampProbability(weibullYInverse(y));
  const percent = f * 100;
  if (percent < 1) return `${percent.toFixed(1)}%`;
  if (percent < 10) return `${percent.toFixed(1)}%`;
  if (percent < 99) return `${percent.toFixed(0)}%`;
  return `${percent.toFixed(1)}%`;
}

export type SelfTestResult = {
  pass: boolean;
  errors: string[];
};

const SELF_TEST_ALL_FAIL: DataPoint[] = [
  { t: 120, status: "FAIL" },
  { t: 150, status: "FAIL" },
  { t: 175, status: "FAIL" },
  { t: 210, status: "FAIL" },
  { t: 260, status: "FAIL" },
  { t: 320, status: "FAIL" },
];

const SELF_TEST_WITH_SUSP: DataPoint[] = [
  { t: 90, status: "FAIL" },
  { t: 110, status: "SUSP" },
  { t: 130, status: "FAIL" },
  { t: 160, status: "SUSP" },
  { t: 200, status: "FAIL" },
  { t: 240, status: "SUSP" },
];

const SELF_TEST_JOHNSON_RANK: DataPoint[] = [
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

export function runInternalWeibullSelfTest(): SelfTestResult {
  const errors: string[] = [];

  const caseA = fitDataset(SELF_TEST_ALL_FAIL, "REGRESSION", 200);
  if (!caseA.fit) {
    errors.push(`Case A failed to fit: ${caseA.error ?? "unknown error"}`);
  } else {
    if (!Number.isFinite(caseA.fit.beta) || !Number.isFinite(caseA.fit.eta) || caseA.fit.beta <= 0 || caseA.fit.eta <= 0) {
      errors.push("Case A produced invalid beta/eta.");
    }
    const expectedB10 = caseA.fit.eta * Math.pow(-Math.log(0.9), 1 / caseA.fit.beta);
    if (Math.abs(caseA.fit.b10 - expectedB10) > Math.max(1e-9, Math.abs(expectedB10) * 1e-6)) {
      errors.push("Case A B10 does not match formula.");
    }
  }

  const caseB = fitDataset(SELF_TEST_WITH_SUSP, "MLE", 180);
  if (!caseB.fit) {
    errors.push(`Case B failed to fit: ${caseB.error ?? "unknown error"}`);
  } else {
    if (!Number.isFinite(caseB.fit.beta) || !Number.isFinite(caseB.fit.eta) || caseB.fit.beta <= 0 || caseB.fit.eta <= 0) {
      errors.push("Case B produced invalid beta/eta.");
    }
    if (!Number.isFinite(caseB.fit.fMission as number) || !Number.isFinite(caseB.fit.rMission as number)) {
      errors.push("Case B mission outputs are invalid.");
    }
    const modelMissionF = weibullCdf(180, caseB.fit.beta, caseB.fit.eta);
    if (Math.abs((caseB.fit.fMission as number) - modelMissionF) > 1e-9) {
      errors.push("Mission point does not match CDF on fitted line.");
    }
  }

  const johnsonPlotPoints = buildPlotPoints(SELF_TEST_JOHNSON_RANK);
  const lastFailure = [...johnsonPlotPoints].reverse().find((point) => point.status === "FAIL");
  if (!lastFailure || lastFailure.F_plot === undefined || Math.abs(lastFailure.F_plot - 0.6699) > 0.0005) {
    errors.push("Johnson rank check failed: last failure plotting position does not match F = 66.99%.");
  }

  return { pass: errors.length === 0, errors };
}
