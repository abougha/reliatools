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
  const [cycles, setCycles] = useState("1000");
  const [solveFor, setSolveFor] = useState("af");

  const solved = useMemo(() => {
    const tMaxS = parseFloat(TmaxStress);
    const tMinS = parseFloat(TminStress);
    const tMaxU = parseFloat(TmaxUse);
    const tMinU = parseFloat(TminUse);
    const M = parseFloat(exponent);
    const N = parseFloat(cycles);
    const deltaTStress = tMaxS - tMinS;
    const deltaTUse = tMaxU - tMinU;
    const AF = Math.pow(deltaTStress / deltaTUse, M);

    switch (solveFor) {
      case "af":
        return AF;
      case "cycles":
        return N / AF;
      case "TmaxStress":
        return (tMinS + deltaTUse * Math.pow(AF, 1 / M)).toFixed(2);
      case "TminStress":
        return (tMaxS - deltaTUse * Math.pow(AF, 1 / M)).toFixed(2);
      case "TmaxUse":
        return (tMinU + deltaTUse).toFixed(2);
      case "TminUse":
        return (tMaxU - deltaTUse).toFixed(2);
      case "exponent":
        return (Math.log(AF) / Math.log(deltaTStress / deltaTUse)).toFixed(2);
      default:
        return null;
    }
  }, [TmaxStress, TminStress, TmaxUse, TminUse, exponent, cycles, solveFor]);

  const deltaTStress = parseFloat(TmaxStress) - parseFloat(TminStress);
  const deltaTUse = parseFloat(TmaxUse) - parseFloat(TminUse);
  const M = parseFloat(exponent);

  const plotData = useMemo(() => {
    const data = [];
    for (let dT = deltaTUse; dT <= deltaTStress + 40; dT += 5) {
      const af = Math.pow(dT / deltaTUse, M);
      const life = parseFloat(cycles) / af;
      data.push({ deltaT: dT, AF: parseFloat(af.toFixed(2)), life: parseFloat(life.toFixed(2)) });
    }
    return data;
  }, [deltaTStress, deltaTUse, M, cycles]);

  const downloadCSV = () => {
    const csv = Papa.unparse(plotData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "thermal_shock_af_plot.csv");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Thermal Shock Acceleration Calculator</h1>

      <div className="bg-gray-50 p-4 rounded mb-6 border">
        <BlockMath math={"AF = \\left(\\frac{\\Delta T_{stress}}{\\Delta T_{use}}\\right)^M"} />
        <ul className="text-sm text-gray-700 mt-2 space-y-1">
  <li><strong>ΔT<sub>stress</sub></strong>: Tmax - Tmin of thermal stress test (°C)</li>
  <li><strong>ΔT<sub>use</sub></strong>: Tmax - Tmin of use environment (°C)</li>
  <li><strong>M</strong>: Acceleration exponent (typically 2–6)</li>
  <li><strong>AF</strong>: Acceleration Factor (ratio of test to use cycles)</li>
</ul>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="text-sm bg-gray-100 rounded p-2">
            ΔT<sub>stress</sub> = {deltaTStress}°C
          </div>
          <div className="text-sm bg-gray-100 rounded p-2">
            ΔT<sub>use</sub> = {deltaTUse}°C
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { id: "TmaxStress", label: "Tmax Stress (°C)", value: TmaxStress, setter: setTmaxStress },
          { id: "TminStress", label: "Tmin Stress (°C)", value: TminStress, setter: setTminStress },
          { id: "TmaxUse", label: "Tmax Use (°C)", value: TmaxUse, setter: setTmaxUse },
          { id: "TminUse", label: "Tmin Use (°C)", value: TminUse, setter: setTminUse },
          { id: "exponent", label: "Exponent (M)", value: exponent, setter: setExponent },
          { id: "cycles", label: "Use Life Cycles", value: cycles, setter: setCycles },
          { id: "af", label: "Acceleration Factor (AF)", value: String(Math.pow(deltaTStress / deltaTUse, M)), setter: () => {} },
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
              value={solveFor === id ? (solved !== null ? String(solved) : "") : value}
              onChange={(e) => setter(e.target.value)}
              disabled={solveFor === id || setter === (() => {})}
              className="w-full p-2 border rounded mt-1"
            />
          </label>
        ))}
      </div>

      <div className="flex justify-end mb-2">
        <button
          onClick={downloadCSV}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Download CSV
        </button>
      </div>

      <div className="mt-6 p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-800 rounded">
        <p className="font-semibold text-lg">Solved {solveFor}: {solved !== null ? String(solved) : "N/A"}</p>
        <p className="text-sm mt-1">
          This corresponds to approximately {(parseFloat(cycles) / Math.pow(deltaTStress / deltaTUse, M)).toFixed(0)} thermal shock cycles at {deltaTStress}°C stress range, simulating {cycles} use cycles.
        </p>
      </div>
       <div className="mt-8 h-80 bg-white p-4 border rounded shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="deltaT" label={{ value: "Stress ΔT (°C)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "AF", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Line type="monotone" dataKey="AF" stroke="#2563EB" strokeWidth={2} dot={false} />
            <ReferenceDot
              x={deltaTStress}
              y={Math.pow(deltaTStress / deltaTUse, M)}
              r={5}
              fill="black"
              stroke="none"
              label={{ value: `(${deltaTStress}°C, ${Math.pow(deltaTStress / deltaTUse, M).toFixed(2)})`, position: "top" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-12 h-80 bg-white p-4 border rounded shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="deltaT" label={{ value: "Stress ΔT (°C)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "Predicted Cycles", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Line type="monotone" dataKey="life" stroke="#10B981" strokeWidth={2} dot={false} />
            <ReferenceDot
              x={deltaTStress}
              y={parseFloat(cycles) / Math.pow(deltaTStress / deltaTUse, M)}
              r={5}
              fill="black"
              stroke="none"
              label={{ value: `(${deltaTStress}°C, ${(parseFloat(cycles) / Math.pow(deltaTStress / deltaTUse, M)).toFixed(0)} cycles)`, position: "top" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
