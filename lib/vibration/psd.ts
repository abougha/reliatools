import type { PsdDefinition, PsdPoint } from "./types";
import type { PsdTemplate } from "./types";
import { psdTemplateMap } from "./templates";

export function parsePsdCsv(text: string): PsdPoint[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const points: PsdPoint[] = [];
  for (const line of lines) {
    const columns = line.split(/,|\t|;/).map((value) => value.trim());
    if (columns.length < 2) continue;
    if (columns[0].toLowerCase().includes("f")) continue;
    const f = Number.parseFloat(columns[0]);
    const g2 = Number.parseFloat(columns[1]);
    if (!Number.isFinite(f) || !Number.isFinite(g2)) continue;
    points.push({ f_hz: f, g2_per_hz: g2 });
  }

  return normalizePsd(points);
}

export function normalizePsd(points: PsdPoint[]): PsdPoint[] {
  const sorted = [...points].sort((a, b) => a.f_hz - b.f_hz);
  const dedup: PsdPoint[] = [];
  for (const point of sorted) {
    const last = dedup[dedup.length - 1];
    if (last && Math.abs(last.f_hz - point.f_hz) < 1e-9) {
      last.g2_per_hz = point.g2_per_hz;
    } else if (point.f_hz > 0) {
      dedup.push({ ...point });
    }
  }
  return dedup;
}

export function integratePsd(points: PsdPoint[]): number {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const df = b.f_hz - a.f_hz;
    if (df <= 0) continue;
    sum += 0.5 * (a.g2_per_hz + b.g2_per_hz) * df;
  }
  return sum;
}

export function grms(points: PsdPoint[]): number {
  const area = integratePsd(points);
  return area > 0 ? Math.sqrt(area) : 0;
}

export function scalePsd(points: PsdPoint[], k: number): PsdPoint[] {
  if (!Number.isFinite(k)) return points;
  return points.map((p) => ({ f_hz: p.f_hz, g2_per_hz: p.g2_per_hz * k }));
}

export function resolvePsdDefinition(
  psd: PsdDefinition,
  templates: Record<string, PsdTemplate>
): PsdPoint[] {
  if (psd.kind === "Csv") return normalizePsd(psd.points);
  const template = templates[psd.templateId];
  if (!template) return [];
  return scalePsd(template.points, psd.scale ?? 1);
}

export function resolvePsdPoints(psd: PsdDefinition): PsdPoint[] {
  if (psd.kind === "Csv") return psd.points;
  const base = psdTemplateMap[psd.templateId]?.points ?? [];
  const k = psd.scale ?? 1;
  return base.map((point) => ({ ...point, g2_per_hz: point.g2_per_hz * k }));
}
