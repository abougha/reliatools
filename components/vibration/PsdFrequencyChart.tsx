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

type PsdSeries = {
  id: string;
  label: string;
  color: string;
  points: PsdPoint[];
};

type PsdFrequencyChartProps = {
  series: PsdSeries[];
  title?: string;
};

export function PsdFrequencyChart({ series, title }: PsdFrequencyChartProps) {
  const data = useMemo(() => {
    const map = new Map<number, Record<string, number>>();
    series.forEach((entry) => {
      entry.points.forEach((point) => {
        if (point.f_hz <= 0) return;
        const existing = map.get(point.f_hz) ?? { f_hz: point.f_hz };
        existing[entry.id] = point.g2_per_hz;
        map.set(point.f_hz, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => (a.f_hz ?? 0) - (b.f_hz ?? 0));
  }, [series]);

  const hasData = data.length > 0;

  const { minF, maxF, minG, maxG } = useMemo(() => {
    let minFreq = Infinity;
    let maxFreq = -Infinity;
    let minVal = Infinity;
    let maxVal = -Infinity;
    data.forEach((row) => {
      const f = row.f_hz ?? 0;
      if (f > 0) {
        minFreq = Math.min(minFreq, f);
        maxFreq = Math.max(maxFreq, f);
      }
      series.forEach((entry) => {
        const v = row[entry.id];
        if (typeof v === "number" && v > 0) {
          minVal = Math.min(minVal, v);
          maxVal = Math.max(maxVal, v);
        }
      });
    });
    return {
      minF: Number.isFinite(minFreq) ? minFreq : 1,
      maxF: Number.isFinite(maxFreq) ? maxFreq : 10,
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
      <div className="mt-2 text-[11px] text-gray-500">ASD (g^2/Hz) vs frequency (Hz), log-log scale.</div>
    </div>
  );
}
