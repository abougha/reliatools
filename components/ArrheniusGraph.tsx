"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ArrheniusGraphProps {
  Ea?: number; // Activation energy (eV)
  useTemp?: number; // Use temperature in °C
}

const k = 8.617e-5; // Boltzmann constant in eV/K

export default function ArrheniusGraph({ Ea = 0.8, useTemp = 55 }: ArrheniusGraphProps) {
  const data = useMemo(() => {
    const points = [] as { temperature: number; AF: number }[];
    const useTempK = useTemp + 273.15;
    for (let stress = useTemp; stress <= 150; stress += 5) {
      const stressK = stress + 273.15;
      const AF = Math.exp((Ea / k) * (1 / useTempK - 1 / stressK));
      points.push({ temperature: stress, AF: parseFloat(AF.toFixed(2)) });
    }
    return points;
  }, [Ea, useTemp]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="temperature"
            label={{ value: "Stress Temp (°C)", position: "insideBottom", offset: -5 }}
          />
          <YAxis label={{ value: "AF", angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(value: number) => value.toFixed(2)} />
          <Line type="monotone" dataKey="AF" stroke="#2563EB" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
