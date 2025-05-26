// components/BurnInGraph.tsx
"use client";

import React, { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Area, ReferenceArea
} from "recharts";

const k = 8.617e-5; // Boltzmann constant in eV/K

type BurnInGraphProps = {
  Ea: number; // Activation Energy (default or custom)
  useTemp: number; // Use temperature in °C
  ovenTemp: number; // Recommended oven temperature (°C)
  durations?: string[]; // Min/Max durations
  EaRange?: string; // Ea range text (optional)
};

export const BurnInGraph: React.FC<BurnInGraphProps> = ({ Ea, useTemp, ovenTemp, durations = [], EaRange = "" }) => {
  const useTempK = useTemp + 273.15;
  const targetLifeHours = 50000 * 0.1; // Default simulated life (10% of 50,000 hours)

  const data = useMemo(() => {
    const points = [];
    for (let T = 100; T <= 150; T += 5) {
      const T_K = T + 273.15;
      const AF = Math.exp(Ea / k * (1 / useTempK - 1 / T_K));
      const duration = targetLifeHours / AF;
      points.push({
        temperature: T,
        duration: duration,
        durationLow: duration * 0.9,
        durationHigh: duration * 1.1,
      });
    }
    return points;
  }, [Ea, useTemp]);

  // Determine Ea for the dot (median Ea if range, custom Ea otherwise)
  let selectedEa = Ea;
  if (durations.length > 1) {
    const minDur = parseFloat(durations[0]);
    const maxDur = parseFloat(durations[1]);
    // Reverse-calculate median Ea estimate
    selectedEa = (EaRange.includes("–"))
      ? (parseFloat(EaRange.split("–")[0]) + parseFloat(EaRange.split("–")[1])) / 2
      : Ea;
  }

  // Calculate dot position at ovenTemp
  const T_K = ovenTemp + 273.15;
  const AF = Math.exp(selectedEa / k * (1 / useTempK - 1 / T_K));
  const dotDuration = targetLifeHours / AF;

  const point = { temperature: ovenTemp, duration: dotDuration };

  const minDuration = durations.length > 1 ? parseFloat(durations[0]) : parseFloat(durations[0] || "0");
  const maxDuration = durations.length > 1 ? parseFloat(durations[1]) : parseFloat(durations[0] || "0");

  return (
    <div className="mt-6 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="temperature"
            label={{ value: "Burn-In Temperature (°C)", position: "insideBottomRight", offset: -5 }}
          />
          <YAxis
            scale="log"
            domain={['auto', 'auto']}
            allowDataOverflow={true}
            label={{
              value: "Test Duration (hours)",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { textAnchor: "middle" },
            }}
            width={100}
            tickFormatter={(tick) => tick.toFixed(1)}
          />
          <Tooltip formatter={(value: number) => `${value.toFixed(1)} hours`} />
          <Area type="monotone" dataKey="durationLow" stroke="none" fill="#cce5ff" fillOpacity={0.3} dot={false} />
          <Area type="monotone" dataKey="durationHigh" stroke="none" fill="#cce5ff" fillOpacity={0.3} dot={false} />
          <Line type="monotone" dataKey="duration" stroke="#007bff" strokeWidth={2} dot={false} />

          {/* Shaded Duration Range */}
          {durations.length > 1 && (
            <ReferenceArea
              y1={minDuration}
              y2={maxDuration}
              fill="#00C49F"
              fillOpacity={0.2}
              label={{
                value: "Recommended Duration Range",
                position: "insideTopLeft",
                fontSize: 12,
                fill: "#00C49F",
              }}
            />
          )}

          {/* Dot at recommended oven temperature */}
          <ReferenceDot
            x={point.temperature}
            y={point.duration}
            r={6}
            fill="black"
            stroke="white"
            strokeWidth={2}
            label={{
              value: `${point.duration.toFixed(1)} hrs`,
              position: "top",
              fontSize: 12,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
