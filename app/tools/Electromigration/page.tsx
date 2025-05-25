// app/tools/Electromigration/page.tsx
"use client";

import { useState, useMemo } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer, ReferenceDot, ReferenceLine
} from "recharts";

const k = 8.617e-5; // Boltzmann constant (eV/K)

const SuggestedTable = () => (
  <table className="text-xs w-auto text-left border">
    <thead className="bg-gray-100">
      <tr>
        <th className="border px-2 py-1">Material</th>
        <th className="border px-2 py-1">Ea (eV)</th>
        <th className="border px-2 py-1">n</th>
      </tr>
    </thead>
    <tbody>
      <tr><td className="border px-2 py-1">Aluminum (Al)</td><td className="border px-2 py-1">0.5–0.7</td><td className="border px-2 py-1">1–2</td></tr>
      <tr><td className="border px-2 py-1">Copper (Cu)</td><td className="border px-2 py-1">0.7–1.0</td><td className="border px-2 py-1">1–2</td></tr>
      <tr><td className="border px-2 py-1">Silver (Ag)</td><td className="border px-2 py-1">~0.6</td><td className="border px-2 py-1">1–2</td></tr>
    </tbody>
  </table>
);

export default function ElectromigrationCalculator() {
  const [solveFor, setSolveFor] = useState("MTTF");
  const [Ea, setEa] = useState("0.7");
  const [currentDensity, setCurrentDensity] = useState("1e5");
  const [temperatureC, setTemperatureC] = useState("125");
  const [n, setN] = useState("1");
  const [A, setA] = useState("1");
  const [MTTF, setMTTF] = useState("1000");

  const T_K = parseFloat(temperatureC) + 273.15;

  const solved = useMemo(() => {
    const EaNum = parseFloat(Ea);
    const j = parseFloat(currentDensity);
    const nNum = parseFloat(n);
    const ANum = parseFloat(A);
    const T = T_K;
    const mttfNum = parseFloat(MTTF);

    let result = 0;

    if (solveFor === "MTTF") {
      result = ANum * Math.pow(j, -nNum) * Math.exp(EaNum / (k * T));
      return { label: "MTTF (hrs)", value: result.toFixed(2) };
    } else if (solveFor === "j") {
      result = Math.pow(ANum * Math.exp(EaNum / (k * T)) / mttfNum, 1 / nNum);
      return { label: "Current Density (A/cm²)", value: result.toExponential(2) };
    } else if (solveFor === "T") {
      const lnPart = Math.log(mttfNum / (ANum * Math.pow(j, -nNum)));
      result = EaNum / (k * lnPart) - 273.15;
      return { label: "Temperature (°C)", value: result.toFixed(2) };
    }

    return { label: "", value: "" };
  }, [solveFor, Ea, currentDensity, temperatureC, n, A, MTTF]);

  const graphData = useMemo(() => {
    const EaNum = parseFloat(Ea);
    const j = parseFloat(currentDensity);
    const nNum = parseFloat(n);
    const ANum = parseFloat(A);
    const mttfNum = parseFloat(MTTF);
    let endTemp = solveFor === "T" ? parseFloat(solved.value) : parseFloat(temperatureC);
    if (isNaN(endTemp)) endTemp = 125;
    endTemp = Math.min(Math.max(50, endTemp), 200); // Clamp between 50 and 200

    const data = [];
    for (let temp = 50; temp <= endTemp; temp += 5) {
      const T_K = temp + 273.15;
      const mttfValue = ANum * Math.pow(j, -nNum) * Math.exp(EaNum / (k * T_K));
      data.push({ temp, mttf: mttfValue });
    }
    return data;
  }, [Ea, currentDensity, n, A, temperatureC, solveFor, solved]);

  const downloadCSV = () => {
    let csv = "Temperature (°C),MTTF (hours)\n";
    graphData.forEach((row) => {
      csv += `${row.temp},${row.mttf}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "electromigration_mttf.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Electromigration Lifetime Calculator</h1>

      <div className="bg-gray-50 p-4 rounded mb-6 border">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
          <div className="flex-1">
            <BlockMath math={"MTTF = A \\cdot j^{-n} \\cdot e^{\\frac{E_a}{kT}}"} />
            <ul className="text-sm text-gray-700 mt-2 space-y-1">
              <li><strong>MTTF</strong> = Mean Time To Failure (hours)</li>
              <li><strong>A</strong> = Constant (user-defined)</li>
              <li><strong>j</strong> = Current density (A/cm²)</li>
              <li><strong>n</strong> = Current density exponent</li>
              <li><strong>E<sub>a</sub></strong> = Activation energy (eV)</li>
              <li><strong>T</strong> = Temperature (K)</li>
              <li><strong>k</strong> = Boltzmann constant = 8.617×10⁻⁵ eV/K</li>
            </ul>
          </div>
          <div className="w-full md:w-auto mt-4 md:mt-0">
            <SuggestedTable />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { label: "MTTF (hrs)", value: MTTF, setter: setMTTF, id: "MTTF" },
          { label: "Current Density (A/cm²)", value: currentDensity, setter: setCurrentDensity, id: "j" },
          { label: "Temperature (°C)", value: temperatureC, setter: setTemperatureC, id: "T" },
          { label: "Activation Energy (eV)", value: Ea, setter: setEa, id: "Ea" },
          { label: "Exponent (n)", value: n, setter: setN, id: "n" },
          { label: "Constant (A)", value: A, setter: setA, id: "A" },
        ].map(({ label, value, setter, id }) => (
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
              value={solveFor === id ? solved.value : value}
              onChange={(e) => setter(e.target.value)}
              disabled={solveFor === id}
              className="w-full p-2 border rounded mt-1"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-800 rounded">
        <p className="font-semibold text-lg">{solved.label}: {solved.value}</p>
        <p className="text-sm mt-1">
          Solve for {solveFor}. Adjust inputs and select a different variable to solve for.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <div className="h-80 bg-white p-4 border rounded shadow">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="temp" label={{ value: "Temperature (°C)", position: "insideBottom", offset: -5 }} />
              <YAxis
                scale="log"
                domain={['auto', 'auto']}
                tickFormatter={(value) => value.toFixed(0)}
                label={{ value: "MTTF (hrs)", angle: -90, position: "insideLeft", offset: -5 }}
              />
              <RechartTooltip formatter={(value: any) => `${value.toFixed(2)} hrs`} />
              <Line type="monotone" dataKey="mttf" stroke="#2563EB" strokeWidth={2} dot={false} />
              <ReferenceDot x={parseFloat(temperatureC)} y={parseFloat(MTTF)} r={5} fill="black" />
              <ReferenceLine x={parseFloat(temperatureC)} stroke="black" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <button onClick={downloadCSV} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Download CSV
        </button>
      </div>
    </div>
  );
}
