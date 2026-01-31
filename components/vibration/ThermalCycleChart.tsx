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
import type { MissionState } from "@/lib/vibration/types";
import { buildMissionRepresentativeThermalCycle } from "@/lib/vibration/thermal";

type ThermalCycleChartProps = {
  states: MissionState[];
  t_test_h: number;
  minCycles?: number;
  minSegmentMin?: number;
};

export function ThermalCycleChart({ states, t_test_h, minCycles = 3, minSegmentMin = 1 }: ThermalCycleChartProps) {
  const cycle = useMemo(
    () => buildMissionRepresentativeThermalCycle(states, t_test_h, minCycles, minSegmentMin),
    [states, t_test_h, minCycles, minSegmentMin]
  );

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold">Thermal Cycle (mission-representative)</div>
        <div className="text-xs text-gray-500">One cycle shown; uses mission state ordering.</div>
      </div>

      {cycle.points.length === 0 ? (
        <div className="text-sm text-gray-500">No thermal data available.</div>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cycle.points}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="t_min"
                  domain={[0, cycle.cycleMinutes]}
                  tickFormatter={(v) => `${Number(v).toFixed(1)}m`}
                />
                <YAxis
                  type="number"
                  dataKey="temp_C"
                  unit="C"
                  tickFormatter={(v) => Number(v).toFixed(1)}
                />
                <Tooltip
                  formatter={(value: number) => `${Number(value).toFixed(1)} C`}
                  labelFormatter={(label) => `${Number(label).toFixed(1)} min`}
                />
                <Line type="stepAfter" dataKey="temp_C" stroke="#0f172a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            One mission-representative cycle shown; repeats {cycle.repeats}x over {t_test_h.toFixed(1)} hours. Cycle length ={" "}
            {cycle.cycleMinutes.toFixed(1)} minutes.
          </div>

          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-600">State dwell table</div>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {cycle.segments.map((segment) => (
                <div key={segment.stateId} className="flex items-center justify-between rounded-lg border px-2 py-1">
                  <div className="min-w-[120px]">{segment.stateName}</div>
                  <div>Field %: {segment.fieldPercent.toFixed(1)}%</div>
                  <div>Cycle minutes: {segment.cycleMinutes.toFixed(1)}</div>
                  <div>T_rep: {segment.temp_C.toFixed(1)} C</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
