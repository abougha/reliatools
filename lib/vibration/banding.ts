import type { DamageBand, PsdPoint } from "./types";
import { normalizePsd } from "./psd";

function interpolate(points: PsdPoint[], f: number): number {
  if (points.length === 0) return 0;
  if (f <= points[0].f_hz) return points[0].g2_per_hz;
  if (f >= points[points.length - 1].f_hz) return points[points.length - 1].g2_per_hz;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (f >= a.f_hz && f <= b.f_hz) {
      const t = (f - a.f_hz) / (b.f_hz - a.f_hz);
      return a.g2_per_hz + t * (b.g2_per_hz - a.g2_per_hz);
    }
  }
  return 0;
}

function integrateBetween(points: PsdPoint[], fStart: number, fEnd: number): number {
  if (points.length < 2 || fEnd <= fStart) return 0;
  const cleaned = normalizePsd(points);
  const samples: PsdPoint[] = [];
  samples.push({ f_hz: fStart, g2_per_hz: interpolate(cleaned, fStart) });
  for (const point of cleaned) {
    if (point.f_hz > fStart && point.f_hz < fEnd) samples.push(point);
  }
  samples.push({ f_hz: fEnd, g2_per_hz: interpolate(cleaned, fEnd) });
  samples.sort((a, b) => a.f_hz - b.f_hz);
  let sum = 0;
  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    const df = b.f_hz - a.f_hz;
    if (df <= 0) continue;
    sum += 0.5 * (a.g2_per_hz + b.g2_per_hz) * df;
  }
  return sum;
}

export function buildBands(points: PsdPoint[], bandCount = 12): DamageBand[] {
  const cleaned = normalizePsd(points);
  if (cleaned.length < 2) return [];
  const fMin = cleaned[0].f_hz;
  const fMax = cleaned[cleaned.length - 1].f_hz;
  if (fMin <= 0 || fMax <= fMin) return [];
  const ratio = Math.pow(fMax / fMin, 1 / bandCount);
  const bands: DamageBand[] = [];
  let fStart = fMin;
  for (let i = 0; i < bandCount; i += 1) {
    const fEnd = i === bandCount - 1 ? fMax : fStart * ratio;
    const fCenter = Math.sqrt(fStart * fEnd);
    const energy = integrateBetween(cleaned, fStart, fEnd);
    const weight = Math.pow(fCenter / fMin, 0.35);
    const score = energy * weight;
    bands.push({
      f_start: fStart,
      f_end: fEnd,
      f_center: fCenter,
      energy,
      weight,
      score,
    });
    fStart = fEnd;
  }
  return bands;
}

export function topDamageBands(points: PsdPoint[], count = 3): DamageBand[] {
  const bands = buildBands(points);
  return [...bands].sort((a, b) => b.score - a.score).slice(0, count);
}
