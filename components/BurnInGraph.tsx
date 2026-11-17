// components/BurnInGraph.tsx
"use client";

import React, { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { kB_eV } from "@/lib/constants";
import { formatSig } from "@/lib/format";

type BurnInGraphProps = {
  /** Activation energies to plot, one curve each (eV). */
  EaValues: number[];
  /** Use temperature (°C). */
  useTemp: number;
  /** Device temperature during burn-in (°C): oven temperature plus self-heating. */
  deviceTemp: number;
  /** Hours of field life the burn-in should consume. */
  simulatedLife: number;
};

const COLORS = ["#2563eb", "#0891b2"];

function burnInHours(Ea: number, useTempC: number, deviceTempC: number, simulatedLife: number) {
  const af = Math.exp((Ea / kB_eV) * (1 / (useTempC + 273.15) - 1 / (deviceTempC + 273.15)));
  return simulatedLife / af;
}

export const BurnInGraph: React.FC<BurnInGraphProps> = ({ EaValues, useTemp, deviceTemp, simulatedLife }) => {
  const data = useMemo(() => {
    // Window around the chosen burn-in temperature, never below the use temperature.
    const start = Math.max(Math.ceil((useTemp + 5) / 5) * 5, Math.floor((deviceTemp - 40) / 5) * 5);
    const end = Math.ceil((deviceTemp + 20) / 5) * 5;
    const points: Array<Record<string, number>> = [];
    for (let T = start; T <= end; T += 5) {
      const row: Record<string, number> = { temperature: T };
      EaValues.forEach((Ea, i) => {
        row[`d${i}`] = burnInHours(Ea, useTemp, T, simulatedLife);
      });
      points.push(row);
    }
    return points;
  }, [EaValues, useTemp, deviceTemp, simulatedLife]);

  return (
    <div className="mt-6 h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="temperature"
            type="number"
            domain={["dataMin", "dataMax"]}
            label={{ value: "Device temperature during burn-in (°C)", position: "insideBottom", offset: -10 }}
          />
          <YAxis
            scale="log"
            domain={["auto", "auto"]}
            width={80}
            tickFormatter={(tick: number) => formatSig(tick, 2)}
            label={{ value: "Burn-in duration (hours)", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${formatSig(value, 3)} hours`, name]}
            labelFormatter={(value) => `${value} °C`}
          />
          <Legend verticalAlign="top" height={28} />
          {EaValues.map((Ea, i) => (
            <Line
              key={Ea}
              type="monotone"
              dataKey={`d${i}`}
              name={`Ea = ${Ea.toFixed(2)} eV`}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          <ReferenceLine x={deviceTemp} stroke="#111827" strokeDasharray="3 3" />
          {EaValues.map((Ea) => (
            <ReferenceDot
              key={`dot-${Ea}`}
              x={deviceTemp}
              y={burnInHours(Ea, useTemp, deviceTemp, simulatedLife)}
              r={5}
              fill="#111827"
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
