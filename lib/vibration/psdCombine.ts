import type { PsdPoint } from "./types";
import { normalizePsd, integratePsd as integratePsdBase, grms as grmsBase } from "./psd";

export function buildLogFrequencyGrid(pointsList: PsdPoint[][], count = 160): number[] {
  let fMin = Infinity;
  let fMax = -Infinity;

  pointsList.forEach((points) => {
    points.forEach((point) => {
      if (point.f_hz > 0) {
        fMin = Math.min(fMin, point.f_hz);
        fMax = Math.max(fMax, point.f_hz);
      }
    });
  });

  if (!Number.isFinite(fMin) || !Number.isFinite(fMax) || fMax <= fMin) return [];

  const logMin = Math.log10(fMin);
  const logMax = Math.log10(fMax);
  const grid: number[] = [];
  const steps = Math.max(2, Math.floor(count));
  for (let i = 0; i < steps; i += 1) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    grid.push(Math.pow(10, logMin + (logMax - logMin) * t));
  }
  return grid;
}

export function interpolateToGrid(points: PsdPoint[], fGrid: number[]): PsdPoint[] {
  const cleaned = normalizePsd(points);
  if (cleaned.length === 0) return fGrid.map((f) => ({ f_hz: f, g2_per_hz: 0 }));

  const output: PsdPoint[] = [];
  let j = 0;
  for (const f of fGrid) {
    if (f <= cleaned[0].f_hz) {
      output.push({ f_hz: f, g2_per_hz: cleaned[0].g2_per_hz });
      continue;
    }
    if (f >= cleaned[cleaned.length - 1].f_hz) {
      output.push({ f_hz: f, g2_per_hz: cleaned[cleaned.length - 1].g2_per_hz });
      continue;
    }
    while (j < cleaned.length - 2 && f > cleaned[j + 1].f_hz) {
      j += 1;
    }
    const a = cleaned[j];
    const b = cleaned[j + 1];
    const df = b.f_hz - a.f_hz;
    const t = df > 0 ? (f - a.f_hz) / df : 0;
    const g2 = a.g2_per_hz + t * (b.g2_per_hz - a.g2_per_hz);
    output.push({ f_hz: f, g2_per_hz: g2 });
  }
  return output;
}

export function combinePsdTimeWeighted(pointsList: PsdPoint[][], durations: number[], fGrid: number[]): PsdPoint[] {
  if (pointsList.length === 0 || fGrid.length === 0) return [];
  const total = durations.reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (total <= 0) return [];

  const weights = durations.map((value) => (Number(value) || 0) / total);
  const interpolated = pointsList.map((points) => interpolateToGrid(points, fGrid));

  return fGrid.map((f, idx) => {
    let g2 = 0;
    interpolated.forEach((series, i) => {
      g2 += (weights[i] || 0) * (series[idx]?.g2_per_hz ?? 0);
    });
    return { f_hz: f, g2_per_hz: g2 };
  });
}

export const integratePsd = integratePsdBase;
export const grms = grmsBase;
