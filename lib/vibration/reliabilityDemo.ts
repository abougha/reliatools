export function solveSampleSize(R_target: number, CL: number, c_allowed: number): number {
  if (R_target <= 0 || R_target >= 1 || CL <= 0 || CL >= 1) return 0;
  const c = Math.max(0, Math.floor(c_allowed));

  if (c === 0) {
    const n = Math.log(1 - CL) / Math.log(R_target);
    return Math.ceil(n);
  }

  let n = Math.max(1, c);
  const maxN = 100000;
  while (n < maxN) {
    const achieved = binomialCdf(n, c, R_target);
    if (achieved >= CL) return n;
    n += 1;
  }
  return maxN;
}

export function binomialCdf(n: number, c: number, R: number): number {
  if (n <= 0) return 0;
  const fail = 1 - R;
  if (fail <= 0) return 1;
  let term = Math.pow(R, n);
  let sum = term;
  for (let i = 0; i < c; i += 1) {
    const numerator = (n - i) * fail;
    const denominator = (i + 1) * R;
    term *= numerator / denominator;
    sum += term;
    if (!Number.isFinite(term) || term === 0) break;
  }
  return Math.min(Math.max(sum, 0), 1);
}
