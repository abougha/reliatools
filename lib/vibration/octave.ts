import type { PsdPoint } from "./types";

function sortPsdPoints(psdPoints: PsdPoint[]): PsdPoint[] {
  return psdPoints
    .filter((point) => Number.isFinite(point.f_hz) && Number.isFinite(point.g2_per_hz) && point.f_hz > 0)
    .slice()
    .sort((a, b) => a.f_hz - b.f_hz);
}

function interpPsdSorted(psdPoints: PsdPoint[], f: number): number {
  if (!Number.isFinite(f)) return 0;
  if (psdPoints.length === 0) return 0;
  if (psdPoints.length === 1) return psdPoints[0]?.g2_per_hz ?? 0;

  const first = psdPoints[0];
  const last = psdPoints[psdPoints.length - 1];
  if (!first || !last) return 0;

  if (f <= first.f_hz) return first.g2_per_hz;
  if (f >= last.f_hz) return last.g2_per_hz;

  for (let i = 0; i < psdPoints.length - 1; i += 1) {
    const left = psdPoints[i];
    const right = psdPoints[i + 1];
    if (!left || !right) continue;
    if (f >= left.f_hz && f <= right.f_hz) {
      if (right.f_hz === left.f_hz) return left.g2_per_hz;
      const t = (f - left.f_hz) / (right.f_hz - left.f_hz);
      return left.g2_per_hz + t * (right.g2_per_hz - left.g2_per_hz);
    }
  }

  return last.g2_per_hz;
}

export function getOctaveCenters(fMin: number, fMax: number, n: number, f0 = 1): number[] {
  if (!Number.isFinite(fMin) || !Number.isFinite(fMax) || n <= 0) return [];
  const min = Math.max(f0, fMin);
  if (!Number.isFinite(min) || !Number.isFinite(fMax) || min <= 0) return [];

  const step = Math.pow(2, 1 / n);
  if (!Number.isFinite(step) || step <= 1) return [];

  const centers: number[] = [];
  let freq = min;
  while (true) {
    centers.push(freq);
    if (freq >= fMax) break;
    freq *= step;
    if (!Number.isFinite(freq)) break;
  }
  return centers;
}

export function octaveBandEdges(fc: number, n: number): { f1: number; f2: number } {
  const factor = Math.pow(2, 1 / (2 * n));
  return { f1: fc / factor, f2: fc * factor };
}

export function interpPsd(psdPoints: PsdPoint[], f: number): number {
  const sorted = sortPsdPoints(psdPoints);
  return interpPsdSorted(sorted, f);
}

export function integratePsdOverBand(psdPoints: PsdPoint[], f1: number, f2: number): number {
  if (!Number.isFinite(f1) || !Number.isFinite(f2) || f2 <= f1) return 0;
  const sorted = sortPsdPoints(psdPoints);
  if (sorted.length === 0) return 0;

  const minF = sorted[0]?.f_hz ?? 0;
  const maxF = sorted[sorted.length - 1]?.f_hz ?? 0;
  const start = Math.max(f1, minF);
  const end = Math.min(f2, maxF);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

  const breakpoints: number[] = [start, end];
  for (const point of sorted) {
    if (point.f_hz > start && point.f_hz < end) {
      breakpoints.push(point.f_hz);
    }
  }
  breakpoints.sort((a, b) => a - b);

  let area = 0;
  for (let i = 0; i < breakpoints.length - 1; i += 1) {
    const a = breakpoints[i];
    const b = breakpoints[i + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    const Sa = interpPsdSorted(sorted, a);
    const Sb = interpPsdSorted(sorted, b);
    area += ((Sa + Sb) / 2) * (b - a);
  }

  return area;
}

export function psdToOctave(
  psdPoints: PsdPoint[],
  n: number,
  f0 = 1
): { points: PsdPoint[]; area: number; grms: number } {
  const sorted = sortPsdPoints(psdPoints);
  if (sorted.length === 0 || n <= 0) {
    return { points: [], area: 0, grms: 0 };
  }

  const fMin = sorted[0]?.f_hz ?? 0;
  const fMax = sorted[sorted.length - 1]?.f_hz ?? 0;
  if (!Number.isFinite(fMin) || !Number.isFinite(fMax) || fMax <= 0) {
    return { points: [], area: 0, grms: 0 };
  }

  const centers = getOctaveCenters(fMin, fMax, n, f0);
  let area = 0;
  const points = centers.map((fc) => {
    const { f1, f2 } = octaveBandEdges(fc, n);
    const bandArea = integratePsdOverBand(sorted, f1, f2);
    const width = f2 - f1;
    const g2_per_hz = width > 0 ? bandArea / width : 0;
    area += bandArea;
    return { f_hz: fc, g2_per_hz };
  });

  return { points, area, grms: Math.sqrt(area) };
}
