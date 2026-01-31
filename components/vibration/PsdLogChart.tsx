import React from "react";
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

type PsdLogChartProps = {
  points: PsdPoint[];
  title?: string;
};

export function PsdLogChart({ points, title }: PsdLogChartProps) {
  const data = points.filter((p) => p.f_hz > 0 && p.g2_per_hz > 0);
  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-gray-500">
        No PSD data to display.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 text-sm font-semibold">{title ?? "PSD (log-log)"}</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="f_hz"
              type="number"
              scale="log"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `${v}`}
            />
            <YAxis
              dataKey="g2_per_hz"
              type="number"
              scale="log"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => Number(v).toExponential(1)}
            />
            <Tooltip
              formatter={(value: number) => Number(value).toExponential(3)}
              labelFormatter={(label) => `${label} Hz`}
            />
            <Line dataKey="g2_per_hz" stroke="#111827" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
