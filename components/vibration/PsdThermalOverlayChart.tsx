import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import type { MissionState, ThermalCondition } from "@/lib/vibration/types";

type ChartPoint = { time_h: number; temp_C: number };

type PsdThermalOverlayChartProps = {
  states: MissionState[];
};

function buildThermalSeries(states: MissionState[]): ChartPoint[] {
  const points: ChartPoint[] = [];
  let currentTime = 0;

  states.forEach((state) => {
    const start = currentTime;
    const end = currentTime + state.duration_h;
    const thermal = state.thermal;

    if (thermal.kind === "Steady") {
      points.push({ time_h: start, temp_C: thermal.T_C });
      points.push({ time_h: end, temp_C: thermal.T_C });
    } else {
      points.push(...buildCyclePoints(start, end, thermal));
    }
    currentTime = end;
  });

  return points;
}

function buildCyclePoints(start: number, end: number, thermal: Extract<ThermalCondition, { kind: "Cycle" }>): ChartPoint[] {
  const points: ChartPoint[] = [];
  if (thermal.cycles_per_hour <= 0) {
    points.push({ time_h: start, temp_C: thermal.Tmin_C });
    points.push({ time_h: end, temp_C: thermal.Tmax_C });
    return points;
  }

  const deltaT = thermal.Tmax_C - thermal.Tmin_C;
  const ramp_h_nom = deltaT > 0 && thermal.ramp_C_per_min > 0 ? deltaT / thermal.ramp_C_per_min / 60 : 0;
  const soak_h_nom = thermal.soak_min / 60;
  const cycle_nom = Math.max(2 * ramp_h_nom + 2 * soak_h_nom, 1e-6);
  const cycle_h = 1 / thermal.cycles_per_hour;
  const scale = Math.min(1, cycle_h / cycle_nom);
  const ramp_h = ramp_h_nom * scale;
  const soak_h = soak_h_nom * scale;

  let t = start;
  while (t < end) {
    points.push({ time_h: t, temp_C: thermal.Tmin_C });
    t = Math.min(t + ramp_h, end);
    points.push({ time_h: t, temp_C: thermal.Tmax_C });
    t = Math.min(t + soak_h, end);
    points.push({ time_h: t, temp_C: thermal.Tmax_C });
    t = Math.min(t + ramp_h, end);
    points.push({ time_h: t, temp_C: thermal.Tmin_C });
    t = Math.min(t + soak_h, end);
  }

  return points;
}

export function PsdThermalOverlayChart({ states }: PsdThermalOverlayChartProps) {
  const data = buildThermalSeries(states);
  const totalHours = states.reduce((sum, state) => sum + state.duration_h, 0);
  const colors = ["#e0f2fe", "#fef3c7", "#dcfce7", "#fce7f3", "#ede9fe"];

  let cursor = 0;
  const segments = states.map((state, index) => {
    const start = cursor;
    const end = cursor + state.duration_h;
    cursor = end;
    return { start, end, name: state.name, color: colors[index % colors.length] };
  });

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">PSD Playlist + Thermal Overlay</div>
          <div className="text-xs text-gray-500">Timeline view with segment blocks and temperature trace.</div>
        </div>
        <div className="text-xs text-gray-500">Total {totalHours.toFixed(0)} h</div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="time_h" domain={[0, totalHours]} tickFormatter={(v) => `${v}h`} />
            <YAxis type="number" dataKey="temp_C" unit="C" />
            <Tooltip formatter={(value: number) => `${value.toFixed(1)} C`} labelFormatter={(label) => `${label} h`} />
            {segments.map((segment) => (
              <ReferenceArea
                key={segment.name}
                x1={segment.start}
                x2={segment.end}
                y1={-1000}
                y2={1000}
                fill={segment.color}
                fillOpacity={0.35}
                ifOverflow="extendDomain"
              />
            ))}
            <Line type="monotone" dataKey="temp_C" stroke="#0f172a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
        {segments.map((segment) => (
          <div key={segment.name} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: segment.color }} />
            {segment.name}
          </div>
        ))}
      </div>
    </div>
  );
}
