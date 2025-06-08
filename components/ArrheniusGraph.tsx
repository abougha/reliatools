"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
} from "recharts";

export type ArrheniusGraphProps = {
  Ea?: number; // activation energy in eV
  useTemp?: number; // use temperature in °C
  stressTemp?: number; // stress temperature in °C highlighted on the plot
};

export default function ArrheniusGraph({ Ea = 0.7, useTemp = 50, stressTemp = 100 }: ArrheniusGraphProps) {
  const k = 8.617e-5;
  const useTempK = useTemp + 273.15;

  const data = useMemo(() => {
    const pts: { stressTemp: number; AF: number }[] = [];
    for (let T = useTemp + 10; T <= stressTemp + 40; T += 10) {
      const TK = T + 273.15;
      const af = Math.exp((Ea / k) * (1 / useTempK - 1 / TK));
      pts.push({ stressTemp: T, AF: parseFloat(af.toFixed(2)) });
    }
    return pts;
  }, [Ea, useTemp, stressTemp]);

  const afHighlight = Math.exp((Ea / k) * (1 / useTempK - 1 / (stressTemp + 273.15)));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="stressTemp" label={{ value: "Stress Temp (°C)", position: "insideBottom", offset: -5 }} />
          <YAxis label={{ value: "AF", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Line type="monotone" dataKey="AF" stroke="#2563EB" strokeWidth={2} dot={false} />
          <ReferenceDot x={stressTemp} y={parseFloat(afHighlight.toFixed(2))} r={4} fill="black" />
          <ReferenceLine x={stressTemp} stroke="black" strokeDasharray="3 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
