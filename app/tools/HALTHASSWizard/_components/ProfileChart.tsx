"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint, FailureEvent, LaneKey, WizardState } from "./types";
import { numberOrNull } from "./utils";

type ProfileChartProps = {
  data: ChartPoint[];
  lanesEnabled: WizardState["lanesEnabled"];
  events: FailureEvent[];
};

const laneConfig: Record<
  LaneKey,
  {
    dataKey: keyof ChartPoint;
    label: string;
    color: string;
    unit: string;
  }
> = {
  temp: { dataKey: "temp_C", label: "Temperature", color: "#dc2626", unit: "degC" },
  vib: { dataKey: "vib_Grms", label: "Vibration", color: "#2563eb", unit: "gRMS" },
  humidity: { dataKey: "humidity_RH", label: "Humidity", color: "#0d9488", unit: "%RH" },
  voltage: { dataKey: "voltage_V", label: "Voltage", color: "#7c3aed", unit: "V" },
  power: { dataKey: "power_Level", label: "Power cycling", color: "#ea580c", unit: "cycles/day" },
};

function findNearestLaneValue(data: ChartPoint[], lane: LaneKey, timeMin: number): number | null {
  const key = laneConfig[lane].dataKey;
  const nearest = data.reduce<{ distance: number; value: number | null }>(
    (best, point) => {
      const value = point[key];
      if (typeof value !== "number" || !Number.isFinite(value)) return best;
      const distance = Math.abs(point.timeMin - timeMin);
      if (distance < best.distance) return { distance, value };
      return best;
    },
    { distance: Number.POSITIVE_INFINITY, value: null }
  );
  return nearest.value;
}

function LaneTooltip({
  active,
  payload,
  lane,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint; value: number }>;
  lane: LaneKey;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const laneKey = laneConfig[lane].dataKey;
  const value = point[laneKey];
  return (
    <div className="rounded border bg-white px-3 py-2 text-xs shadow">
      <div className="font-semibold text-gray-900">{laneConfig[lane].label}</div>
      <div className="text-gray-700">Time: {point.timeMin.toFixed(2)} min</div>
      <div className="text-gray-700">
        Value: {typeof value === "number" ? `${value.toFixed(3).replace(/\.?0+$/, "")} ${laneConfig[lane].unit}` : "N/A"}
      </div>
      <div className="text-gray-500">Phase: {point.phase}</div>
    </div>
  );
}

export default function ProfileChart({ data, lanesEnabled, events }: ProfileChartProps) {
  const allLanes: LaneKey[] = ["temp", "vib", "humidity", "voltage", "power"];
  const activeLanes = allLanes.filter((lane) => (lane === "temp" ? true : lanesEnabled[lane]));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-600">
        Configure valid lane inputs to generate the HALT timeline chart.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeLanes.map((lane) => {
        const config = laneConfig[lane];
        const laneEvents = events.filter((event) => event.lane === lane && numberOrNull(event.timeMin) !== null);
        return (
          <div key={lane} className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                {config.label} lane ({config.unit})
              </h4>
              <span className="text-xs text-gray-500">Time from start (min)</span>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeMin" type="number" domain={["dataMin", "dataMax"]} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={52} />
                  <Tooltip content={<LaneTooltip lane={lane} />} />
                  <Line
                    type="stepAfter"
                    dataKey={config.dataKey}
                    stroke={config.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />

                  {laneEvents.map((event) => {
                    const time = numberOrNull(event.timeMin);
                    if (time === null) return null;
                    return (
                      <ReferenceLine
                        key={`line-${event.id}`}
                        x={time}
                        stroke="#111827"
                        strokeDasharray="3 3"
                        label={{ value: event.type, position: "insideTopRight", fill: "#111827", fontSize: 10 }}
                      />
                    );
                  })}
                  {laneEvents.map((event) => {
                    const time = numberOrNull(event.timeMin);
                    if (time === null) return null;
                    const y = findNearestLaneValue(data, lane, time);
                    if (y === null) return null;
                    return (
                      <ReferenceDot
                        key={`dot-${event.id}`}
                        x={time}
                        y={y}
                        r={4}
                        fill="#111827"
                        stroke="none"
                        label={{ value: event.note || "Failure", position: "top", fill: "#111827", fontSize: 10 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
