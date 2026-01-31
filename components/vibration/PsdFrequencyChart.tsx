import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PsdPoint } from "@/lib/vibration/types";
import { getOctaveCenters, integratePsdOverBand, octaveBandEdges } from "@/lib/vibration/octave";

type PsdSeries = {
  id: string;
  label: string;
  color: string;
  points: PsdPoint[];
};

type PsdFrequencyChartProps = {
  series: PsdSeries[];
  title?: string;
  octaveN?: number;
  octaveLabel?: string;
};

type SeriesMetric = {
  id: string;
  label: string;
  rawGrms: number;
  octaveGrms: number;
  deviationPct: number;
};

function getSeriesRange(points: PsdPoint[]): { minF: number; maxF: number } | null {
  let minF = Infinity;
  let maxF = -Infinity;
  points.forEach((point) => {
    if (point.f_hz > 0) {
      minF = Math.min(minF, point.f_hz);
      maxF = Math.max(maxF, point.f_hz);
    }
  });
  if (!Number.isFinite(minF) || !Number.isFinite(maxF) || maxF <= 0) return null;
  return { minF, maxF };
}

export function PsdFrequencyChart({ series, title, octaveN = 3, octaveLabel }: PsdFrequencyChartProps) {
  const octaveFormat = octaveLabel ?? `1/${octaveN}`;

  const { data, metrics, minF, maxF } = useMemo(() => {
    let globalMinF = Infinity;
    let globalMaxF = -Infinity;
    series.forEach((entry) => {
      entry.points.forEach((point) => {
        if (point.f_hz > 0) {
          globalMinF = Math.min(globalMinF, point.f_hz);
          globalMaxF = Math.max(globalMaxF, point.f_hz);
        }
      });
    });

    if (!Number.isFinite(globalMinF) || !Number.isFinite(globalMaxF) || globalMaxF <= 0) {
      return { data: [], metrics: [], minF: 1, maxF: 10 };
    }

    const centers = getOctaveCenters(globalMinF, globalMaxF, octaveN, 1);
    const octAreaById = new Map<string, number>();
    series.forEach((entry) => {
      octAreaById.set(entry.id, 0);
    });

    const data = centers.map((fc) => {
      const row: Record<string, number> = { f_hz: fc };
      series.forEach((entry) => {
        const { f1, f2 } = octaveBandEdges(fc, octaveN);
        const bandArea = integratePsdOverBand(entry.points, f1, f2);
        const width = f2 - f1;
        row[entry.id] = width > 0 ? bandArea / width : 0;
        octAreaById.set(entry.id, (octAreaById.get(entry.id) ?? 0) + bandArea);
      });
      return row;
    });

    const metrics: SeriesMetric[] = series.map((entry) => {
      const range = getSeriesRange(entry.points);
      const rawArea = range ? integratePsdOverBand(entry.points, range.minF, range.maxF) : 0;
      const rawGrms = Math.sqrt(rawArea);
      const octaveArea = octAreaById.get(entry.id) ?? 0;
      const octaveGrms = Math.sqrt(octaveArea);
      const deviationPct = rawGrms > 0 ? (Math.abs(octaveGrms - rawGrms) / rawGrms) * 100 : 0;
      return { id: entry.id, label: entry.label, rawGrms, octaveGrms, deviationPct };
    });

    const minF = centers[0] ?? globalMinF;
    const maxF = centers[centers.length - 1] ?? globalMaxF;
    return { data, metrics, minF, maxF };
  }, [series, octaveN]);

  const hasData = data.length > 0;

  const { minG, maxG } = useMemo(() => {
    let minVal = Infinity;
    let maxVal = -Infinity;
    data.forEach((row) => {
      series.forEach((entry) => {
        const v = row[entry.id];
        if (typeof v === "number" && v > 0) {
          minVal = Math.min(minVal, v);
          maxVal = Math.max(maxVal, v);
        }
      });
    });
    return {
      minG: Number.isFinite(minVal) ? minVal : 1e-6,
      maxG: Number.isFinite(maxVal) ? maxVal : 1,
    };
  }, [data, series]);

  if (!hasData) {
    return <div className="text-sm text-gray-500">No PSD data to display.</div>;
  }

  return (
    <div>
      {title && <div className="mb-2 text-sm font-semibold">{title}</div>}
      <div className="mb-2 flex flex-wrap gap-2 text-xs text-gray-500">
        {series.map((entry) => (
          <div key={entry.id} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.label}
          </div>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="f_hz"
              type="number"
              scale="log"
              domain={[minF, maxF]}
              tickFormatter={(v) => Number(v).toFixed(1)}
            />
            <YAxis
              type="number"
              scale="log"
              domain={[minG, maxG]}
              tickFormatter={(v) => Number(v).toExponential(1)}
            />
            <Tooltip
              formatter={(value: number) => Number(value).toExponential(1)}
              labelFormatter={(label) => `${Number(label).toFixed(1)} Hz`}
            />
            {series.map((entry) => (
              <Line key={entry.id} dataKey={entry.id} stroke={entry.color} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-[11px] text-gray-500">
        Frequency (Hz) - {octaveFormat} octave centers; PSD (g^2/Hz), log-log scale.
      </div>
      <div className="mt-1 space-y-1 text-[11px] text-gray-500">
        {metrics.map((metric) => (
          <div key={metric.id}>
            {metric.label}: gRMS (raw) = {metric.rawGrms.toFixed(3)}, gRMS (octave) ={" "}
            {metric.octaveGrms.toFixed(3)}
            {metric.deviationPct > 5 && (
              <span className="ml-2 text-amber-600">octave conversion smoothing changed area; check PSD range.</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
