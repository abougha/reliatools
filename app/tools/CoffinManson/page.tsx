"use client";

import { useState, useMemo } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot
} from "recharts";
import Papa from "papaparse";
import { saveAs } from "file-saver";


export default function ThermalShockCalculator() {
  const [TmaxStress, setTmaxStress] = useState("125");
  const [TminStress, setTminStress] = useState("-40");
  const [TmaxUse, setTmaxUse] = useState("85");
  const [TminUse, setTminUse] = useState("0");
  const [exponent, setExponent] = useState("2");
  const [useCycles, setUseCycles] = useState("1000");
  const [accelCycles, setAccelCycles] = useState("100");
  const [solveFor, setSolveFor] = useState("accelCycles");

  const solved = useMemo(() => {
    const tMaxS = parseFloat(TmaxStress);
    const tMinS = parseFloat(TminStress);
    const tMaxU = parseFloat(TmaxUse);
    const tMinU = parseFloat(TminUse);
    const M = parseFloat(exponent);
    const Nuse = parseFloat(useCycles);
    const Nacc = parseFloat(accelCycles);
    const deltaTStress = tMaxS - tMinS;
    const deltaTUse = tMaxU - tMinU;
    const AF = Math.pow(deltaTStress / deltaTUse, M);

    switch (solveFor) {
      case "TmaxStress":
        return (tMinS + deltaTUse * Math.pow(Nuse / Nacc, 1 / M)).toFixed(2);
      case "TminStress":
        return (tMaxS - deltaTUse * Math.pow(Nuse / Nacc, 1 / M)).toFixed(2);
      case "TmaxUse":
        return (tMinU + deltaTUse).toFixed(2);
      case "TminUse":
        return (tMaxU - deltaTUse).toFixed(2);
      case "exponent":
        return (Math.log(Nuse / Nacc) / Math.log(deltaTStress / deltaTUse)).toFixed(2);
      case "useCycles":
        return (Nacc * AF).toFixed(0);
      case "accelCycles":
        return (Nuse / AF).toFixed(0);
      default:
        return null;
    }
  }, [TmaxStress, TminStress, TmaxUse, TminUse, exponent, useCycles, accelCycles, solveFor]);

  const deltaTUse = parseFloat(TmaxUse) - parseFloat(TminUse);
  const deltaTStress = parseFloat(TmaxStress) - parseFloat(TminStress);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Thermal Shock Acceleration Calculator</h1>

      <div className="bg-gray-50 p-4 rounded mb-6 border">
        <BlockMath math={"AF = \\left(\\frac{\\Delta T_{stress}}{\\Delta T_{use}}\\right)^M = \\frac{N_{use}}{N_{acc}}"} />
        <ul className="text-sm text-gray-700 mt-2 space-y-1">
          <li><strong>ΔT<sub>stress</sub></strong>: Tmax - Tmin of thermal stress test (°C)</li>
          <li><strong>ΔT<sub>use</sub></strong>: Tmax - Tmin of use environment (°C)</li>
          <li><strong>M</strong>: Acceleration exponent (typically 2–6)</li>
          <li><strong>N<sub>use</sub></strong>: Cycles in normal use</li>
          <li><strong>N<sub>acc</sub></strong>: Cycles under accelerated conditions</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { id: "TmaxStress", label: "Tmax Stress (°C)", value: TmaxStress, setter: setTmaxStress },
          { id: "TminStress", label: "Tmin Stress (°C)", value: TminStress, setter: setTminStress },
          { id: "TmaxUse", label: "Tmax Use (°C)", value: TmaxUse, setter: setTmaxUse },
          { id: "TminUse", label: "Tmin Use (°C)", value: TminUse, setter: setTminUse },
          { id: "exponent", label: "Exponent (M)", value: exponent, setter: setExponent },
          { id: "useCycles", label: "Use Life Cycles (Nuse)", value: useCycles, setter: setUseCycles },
          { id: "accelCycles", label: "Accelerated Cycles (Nacc)", value: accelCycles, setter: setAccelCycles },
        ].map(({ id, label, value, setter }) => (
          <label key={id} className={`block text-sm ${solveFor === id ? "bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded" : ""}`}>
            <input
              type="radio"
              name="solveFor"
              value={id}
              checked={solveFor === id}
              onChange={(e) => setSolveFor(e.target.value)}
              className="mr-2"
            />
            {label}
            <input
              type="number"
              value={solveFor === id && solved !== null ? solved : value}
              onChange={(e) => setter(e.target.value)}
              disabled={solveFor === id}
              className="w-full p-2 border rounded mt-1"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-800 rounded">
        <p className="font-semibold text-lg">Solved {solveFor}: {solved !== null ? solved : "N/A"}</p>
      </div>

      <div className="mt-12 h-80 bg-white p-4 border rounded shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={(() => {
            const tMaxS = parseFloat(TmaxStress);
            const tMinS = parseFloat(TminStress);
            const tMaxU = parseFloat(TmaxUse);
            const tMinU = parseFloat(TminUse);
            const M = parseFloat(exponent);
            const Nuse = parseFloat(useCycles);
            const deltaTUse = tMaxU - tMinU;
            const points = [];
            for (let dT = deltaTUse; dT <= (tMaxS - tMinS) + 40; dT += 5) {
              const AF = Math.pow(dT / deltaTUse, M);
              const Nacc = Nuse / AF;
              points.push({ deltaT: dT, cycles: Math.round(Nacc) });
            }
            return points;
          })()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="deltaT" label={{ value: "ΔT (°C)", position: "insideBottom", offset: -5 }} />
            <YAxis scale="log" domain={['auto', 'auto']} label={{ value: "Accelerated Cycles (log)", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Line type="monotone" dataKey="cycles" stroke="#2563EB" strokeWidth={2} dot={false} />
            <ReferenceDot
              x={deltaTUse}
              y={parseFloat(useCycles)}
              r={5}
              fill="green"
              stroke="none"
              label={{ value: `ΔT_use`, position: "top" }}
            />
            <ReferenceDot
  ifOverflow="extendDomain"
  x={deltaTStress}
  y={(() => {
    const tMaxU = parseFloat(TmaxUse);
    const tMinU = parseFloat(TminUse);
    const M = parseFloat(exponent);
    const Nuse = parseFloat(useCycles);
    const deltaTUse = tMaxU - tMinU;
    const AF = Math.pow(deltaTStress / deltaTUse, M);
    return Nuse / AF;
  })()}
  r={5}
  fill="black"
  stroke="none"
  label={{
    value: `ΔT_stress (${deltaTStress.toFixed(1)}°C, ${(parseFloat(useCycles) / Math.pow(deltaTStress / deltaTUse, parseFloat(exponent))).toFixed(0)} cycles)`,
    position: "top"
  }}
/>

          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              const tMaxS = parseFloat(TmaxStress);
              const tMinS = parseFloat(TminStress);
              const tMaxU = parseFloat(TmaxUse);
              const tMinU = parseFloat(TminUse);
              const M = parseFloat(exponent);
              const Nuse = parseFloat(useCycles);
              const deltaTUse = tMaxU - tMinU;
              const points = [];
              for (let dT = deltaTUse; dT <= (tMaxS - tMinS) + 40; dT += 5) {
                const AF = Math.pow(dT / deltaTUse, M);
                const Nacc = Nuse / AF;
                points.push({ deltaT: dT, cycles: Math.round(Nacc) });
              }
              const csv = Papa.unparse(points);
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              saveAs(blob, "thermal_shock_cycles_plot.csv");
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
