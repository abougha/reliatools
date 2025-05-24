// Enhanced Arrhenius Calculator with solver, plot marker, and KaTeX fix
"use client";

import { useState, useMemo } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer, ReferenceDot, ReferenceLine
} from "recharts";
import "react-tooltip/dist/react-tooltip.css";

const EaTable = () => (
  <table className="text-xs w-auto text-left border ml-4">
    <thead className="bg-gray-100">
      <tr>
        <th className="border px-2 py-1">Material</th>
        <th className="border px-2 py-1">Ea (eV)</th>
      </tr>
    </thead>
    <tbody>
      <tr><td className="border px-2 py-1">Plastic</td><td className="border px-2 py-1">0.4–1.2</td></tr>
      <tr><td className="border px-2 py-1">Semiconductor</td><td className="border px-2 py-1">0.2–0.6</td></tr>
      <tr><td className="border px-2 py-1">Metal</td><td className="border px-2 py-1">0.5–0.9</td></tr>
      <tr><td className="border px-2 py-1">Ceramic</td><td className="border px-2 py-1">0.9–1.5</td></tr>
    </tbody>
  </table>
);
export const metadata = {
  title: "Arrhenius Calculator | Predict Acceleration Factor – Reliatools",
  description: "Use the Arrhenius calculator to estimate thermal acceleration factors and predict product lifespan under accelerated conditions. Free tool for reliability engineers.",
  keywords: ["Arrhenius Calculator", "Acceleration Factor", "Reliability Engineering", "Thermal Aging", "Predictive Maintenance"],
  openGraph: {
    title: "Arrhenius Calculator | Predict Acceleration Factor – Reliatools",
    description: "Estimate thermal acceleration factors using the Arrhenius model. Free tool for reliability engineers.",
    url: "https://www.reliatools.com/tools/arrhenius",
    siteName: "Reliatools",
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: "https://www.reliatools.com/tools/arrhenius",
  },
};

export default function ArrheniusCalculator() {
  const k = 8.617e-5;
  const [Ea, setEa] = useState("0.7");
  const [Tuse, setTuse] = useState("50");
  const [Tstress, setTstress] = useState("100");
  const [useHours, setUseHours] = useState("1000");
  const [testHours, setTestHours] = useState("500");
  const [solveFor, setSolveFor] = useState("af");

  const TuseK = parseFloat(Tuse) + 273.15;
  const TstressK = parseFloat(Tstress) + 273.15;

  const calculatedAF = useMemo(() => {
    return Math.exp((parseFloat(Ea) / k) * (1 / TuseK - 1 / TstressK));
  }, [Ea, Tuse, Tstress]);

  const solved = useMemo(() => {
    const U = parseFloat(useHours);
    const T = parseFloat(testHours);
    const AF = calculatedAF;

    switch (solveFor) {
      case "useHours":
        return { AF, value: (AF * T).toFixed(2), label: "Use Life (hrs)" };
      case "testHours":
        return { AF, value: (U / AF).toFixed(2), label: "Test Duration (hrs)" };
      case "af":
      default:
        return { AF, value: (U / T).toFixed(2), label: "Acceleration Factor" };
    }
  }, [Ea, Tuse, Tstress, useHours, testHours, solveFor, calculatedAF]);

  const afGraphData = useMemo(() => {
    const EaNum = parseFloat(Ea);
    const TstressEnd = parseFloat(Tstress) + 20;
    const points = [];
    for (let TstressC = 25; TstressC <= TstressEnd; TstressC += 5) {
      const TstressK = TstressC + 273.15;
      const af = Math.exp((EaNum / k) * (1 / TuseK - 1 / TstressK));
      points.push({ stressTemp: TstressC, AF: parseFloat(af.toFixed(2)) });
    }
    return points;
  }, [Ea, Tuse, Tstress]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Arrhenius Calculator</h1>

      <div className="bg-gray-50 p-4 rounded mb-6 border">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
          <div className="flex-1">
            <BlockMath math={"AF = e^{\\left(\\frac{E_a}{k} \\left(\\frac{1}{T_{use}} - \\frac{1}{T_{stress}}\\right)\\right)}"} />
            <ul className="text-sm text-gray-700 mt-2 space-y-1">
              <li><strong>E<sub>a</sub></strong> = Activation energy (eV)</li>
              <li><strong>k</strong> = Boltzmann constant = 8.617×10⁻⁵ eV/K</li>
              <li><strong>T<sub>use</sub></strong> = Use temperature (K)</li>
              <li><strong>T<sub>stress</sub></strong> = Stress temperature (K)</li>
              <li><strong>Use Life</strong> = Desired use duration (hours)</li>
              <li><strong>Test Duration</strong> = Time to simulate under stress (hours)</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2 italic">
              Based on the original Arrhenius formulation: Svante Arrhenius, Z. Phys. Chem. 4 (1889) 226.
            </p>
          </div>
          <div className="w-full md:w-auto mt-4 md:mt-0">
            <EaTable />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { label: "Activation Energy (eV)", value: Ea, setter: setEa, id: "Ea" },
          { label: "Use Temp (°C)", value: Tuse, setter: setTuse, id: "Tuse" },
          { label: "Stress Temp (°C)", value: Tstress, setter: setTstress, id: "Tstress" },
          { label: "Use Life (hrs)", value: useHours, setter: setUseHours, id: "useHours" },
          { label: "Test Duration (hrs)", value: testHours, setter: setTestHours, id: "testHours" },
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
          To simulate {useHours} hours of use at {Tuse}°C, test for {testHours} hours at {Tstress}°C.
        </p>
      </div>

      <div className="mt-8 h-80 bg-white p-4 border rounded shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={afGraphData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stressTemp" label={{ value: "Stress Temp (°C)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "AF", angle: -90, position: "insideLeft" }} />
            <RechartTooltip />
            <Line type="monotone" dataKey="AF" stroke="#2563EB" strokeWidth={2} dot={false} />
            <ReferenceDot
              x={parseFloat(Tstress)}
              y={solved.AF}
              r={5}
              fill="black"
              stroke="none"
              label={{ value: `(${Tstress}°C, ${solved.AF.toFixed(2)})`, position: "top" }}
            />
            <ReferenceLine x={parseFloat(Tstress)} stroke="black" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
