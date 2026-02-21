"use client";

import { useEffect, useMemo, useState } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import "react-tooltip/dist/react-tooltip.css";

const EaTable = () => (
  <table className="ml-4 w-auto border text-left text-xs">
    <thead className="bg-gray-100">
      <tr>
        <th className="border px-2 py-1">Material</th>
        <th className="border px-2 py-1">Ea (eV)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="border px-2 py-1">Plastic</td>
        <td className="border px-2 py-1">0.4-1.2</td>
      </tr>
      <tr>
        <td className="border px-2 py-1">Semiconductor</td>
        <td className="border px-2 py-1">0.2-0.6</td>
      </tr>
      <tr>
        <td className="border px-2 py-1">Metal</td>
        <td className="border px-2 py-1">0.5-0.9</td>
      </tr>
      <tr>
        <td className="border px-2 py-1">Ceramic</td>
        <td className="border px-2 py-1">0.9-1.5</td>
      </tr>
    </tbody>
  </table>
);

type SolveTarget = "Ea" | "Tuse" | "Tstress" | "useHours" | "testHours";

const k = 8.617e-5; // eV/K

export default function ArrheniusCalculator() {
  const [Ea, setEa] = useState("0.7");
  const [Tuse, setTuse] = useState("50");
  const [Tstress, setTstress] = useState("100");
  const [useHours, setUseHours] = useState("8000");
  const [testHours, setTestHours] = useState("500");
  const [solveFor, setSolveFor] = useState<SolveTarget>("Tstress");
  const [solverError, setSolverError] = useState("");

  const formatNum = (value: number) => {
    if (!Number.isFinite(value)) return "";
    return value.toFixed(4).replace(/\.?0+$/, "");
  };

  const EaNum = parseFloat(Ea);
  const TuseCNum = parseFloat(Tuse);
  const TstressCNum = parseFloat(Tstress);
  const useHoursNum = parseFloat(useHours);
  const testHoursNum = parseFloat(testHours);

  const TuseK = TuseCNum + 273.15;
  const TstressK = TstressCNum + 273.15;

  const arrheniusAF = useMemo(() => {
    if (!Number.isFinite(EaNum) || EaNum <= 0) return NaN;
    if (!Number.isFinite(TuseK) || !Number.isFinite(TstressK) || TuseK <= 0 || TstressK <= 0) return NaN;
    return Math.exp((EaNum / k) * (1 / TuseK - 1 / TstressK));
  }, [EaNum, TuseK, TstressK]);

  const timeRatioAF = useMemo(() => {
    if (!Number.isFinite(useHoursNum) || !Number.isFinite(testHoursNum) || testHoursNum <= 0) return NaN;
    return useHoursNum / testHoursNum;
  }, [useHoursNum, testHoursNum]);

  useEffect(() => {
    setSolverError("");

    if (!Number.isFinite(useHoursNum) || !Number.isFinite(testHoursNum) || useHoursNum <= 0 || testHoursNum <= 0) {
      setSolverError("Use Life and Test Duration must be positive.");
      return;
    }
    if (!Number.isFinite(TuseK) || !Number.isFinite(TstressK) || TuseK <= 0 || TstressK <= 0) {
      setSolverError("Use Temp and Stress Temp must be valid Celsius values.");
      return;
    }

    if (solveFor === "Tstress") {
      if (!Number.isFinite(EaNum) || EaNum <= 0) {
        setSolverError("Activation Energy must be positive.");
        return;
      }

      const AF = useHoursNum / testHoursNum;
      if (!Number.isFinite(AF) || AF <= 1) {
        setSolverError("For accelerated testing, AF = Use Life / Test Duration must be > 1.");
        return;
      }

      const nextTstressK = 1 / ((1 / TuseK) - (k / EaNum) * Math.log(AF));
      if (!Number.isFinite(nextTstressK)) {
        setSolverError("Unable to solve Stress Temp with current inputs.");
        return;
      }
      if (nextTstressK <= TuseK) {
        setSolverError("Computed Stress Temp must be above Use Temp for acceleration.");
        return;
      }

      setTstress(formatNum(nextTstressK - 273.15));
      return;
    }

    if (solveFor === "testHours") {
      if (!Number.isFinite(arrheniusAF) || arrheniusAF <= 0) {
        setSolverError("Unable to compute AF from Ea and temperatures.");
        return;
      }
      setTestHours(formatNum(useHoursNum / arrheniusAF));
      return;
    }

    if (solveFor === "useHours") {
      if (!Number.isFinite(arrheniusAF) || arrheniusAF <= 0) {
        setSolverError("Unable to compute AF from Ea and temperatures.");
        return;
      }
      setUseHours(formatNum(arrheniusAF * testHoursNum));
      return;
    }

    if (solveFor === "Tuse") {
      if (!Number.isFinite(EaNum) || EaNum <= 0) {
        setSolverError("Activation Energy must be positive.");
        return;
      }

      const AF = useHoursNum / testHoursNum;
      if (!Number.isFinite(AF) || AF <= 0) {
        setSolverError("AF = Use Life / Test Duration must be positive.");
        return;
      }

      const nextTuseK = 1 / ((1 / TstressK) + (k / EaNum) * Math.log(AF));
      if (!Number.isFinite(nextTuseK) || nextTuseK <= 0) {
        setSolverError("Unable to solve Use Temp with current inputs.");
        return;
      }

      setTuse(formatNum(nextTuseK - 273.15));
      return;
    }

    if (solveFor === "Ea") {
      const AF = useHoursNum / testHoursNum;
      const denominator = 1 / TuseK - 1 / TstressK;
      if (!Number.isFinite(AF) || AF <= 0 || !Number.isFinite(denominator) || denominator === 0) {
        setSolverError("Unable to solve Activation Energy with current inputs.");
        return;
      }

      const nextEa = (k * Math.log(AF)) / denominator;
      if (!Number.isFinite(nextEa) || nextEa <= 0) {
        setSolverError("Computed Activation Energy is not physically valid.");
        return;
      }

      setEa(formatNum(nextEa));
    }
  }, [EaNum, TuseK, TstressK, useHoursNum, testHoursNum, solveFor, arrheniusAF]);

  const afGraphData = useMemo(() => {
    if (!Number.isFinite(EaNum) || EaNum <= 0 || !Number.isFinite(TuseK) || TuseK <= 0) return [];

    const start = 25;
    const endFromInput = Number.isFinite(TstressCNum) ? TstressCNum + 20 : 125;
    const end = Math.max(start + 10, endFromInput);
    const points: Array<{ stressTemp: number; AF: number }> = [];

    for (let stressTempC = start; stressTempC <= end; stressTempC += 5) {
      const stressTempK = stressTempC + 273.15;
      const af = Math.exp((EaNum / k) * (1 / TuseK - 1 / stressTempK));
      points.push({ stressTemp: stressTempC, AF: parseFloat(af.toFixed(2)) });
    }

    return points;
  }, [EaNum, TuseK, TstressCNum]);

  const markerX = Number.isFinite(TstressCNum) ? TstressCNum : undefined;
  const markerY = Number.isFinite(arrheniusAF) ? arrheniusAF : undefined;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Arrhenius Calculator</h1>

      <div className="mb-6 rounded border bg-gray-50 p-4">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
          <div className="flex-1">
            <BlockMath math={"AF = e^{\\left(\\frac{E_a}{k}\\left(\\frac{1}{T_{use}} - \\frac{1}{T_{stress}}\\right)\\right)}"} />
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <strong>E<sub>a</sub></strong> = Activation energy (eV)
              </li>
              <li>
                <strong>k</strong> = Boltzmann constant = 8.617e-5 eV/K
              </li>
              <li>
                <strong>T<sub>use</sub></strong> = Use temperature (K)
              </li>
              <li>
                <strong>T<sub>stress</sub></strong> = Stress temperature (K)
              </li>
              <li>
                <strong>Use Life</strong> = Desired use duration (hours)
              </li>
              <li>
                <strong>Test Duration</strong> = Time to simulate under stress (hours)
              </li>
            </ul>
            <p className="mt-2 text-xs italic text-gray-500">
              Based on the original Arrhenius formulation: Svante Arrhenius, Z. Phys. Chem. 4 (1889) 226.
            </p>
          </div>
          <div className="mt-4 w-full md:mt-0 md:w-auto">
            <EaTable />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Activation Energy (eV)", value: Ea, setter: setEa, id: "Ea" as const },
          { label: "Use Temp (\u00B0C)", value: Tuse, setter: setTuse, id: "Tuse" as const },
          { label: "Stress Temp (\u00B0C)", value: Tstress, setter: setTstress, id: "Tstress" as const },
          { label: "Use Life (hrs)", value: useHours, setter: setUseHours, id: "useHours" as const },
          { label: "Test Duration (hrs)", value: testHours, setter: setTestHours, id: "testHours" as const },
        ].map(({ label, value, setter, id }) => (
          <label
            key={id}
            className={`block rounded text-sm ${solveFor === id ? "rounded border-l-4 border-yellow-400 bg-yellow-50 p-2" : ""}`}
          >
            <input
              type="radio"
              name="solveFor"
              value={id}
              checked={solveFor === id}
              onChange={(e) => setSolveFor(e.target.value as SolveTarget)}
              className="mr-2"
            />
            {label}
            <input
              type="number"
              value={value}
              onChange={(e) => setter(e.target.value)}
              disabled={solveFor === id}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
        <p className="text-lg font-semibold">
          Acceleration Factor (Use Life / Test Duration): {Number.isFinite(timeRatioAF) ? formatNum(timeRatioAF) : "N/A"}
        </p>
        <p className="mt-1 text-sm">
          Acceleration Factor (from Ea and temperatures): {Number.isFinite(arrheniusAF) ? formatNum(arrheniusAF) : "N/A"}
        </p>
        <p className="mt-1 text-sm">
          To simulate {useHours} hours of use at {Tuse}&deg;C, test for {testHours} hours at {Tstress}&deg;C.
        </p>
        {solverError ? <p className="mt-2 text-sm text-red-700">{solverError}</p> : null}
      </div>

      <div className="mt-8 h-80 rounded border bg-white p-4 shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={afGraphData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stressTemp" label={{ value: "Stress Temp (\u00B0C)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "AF", angle: -90, position: "insideLeft" }} />
            <RechartTooltip />
            <Line type="monotone" dataKey="AF" stroke="#2563EB" strokeWidth={2} dot={false} />
            {markerX !== undefined && markerY !== undefined ? (
              <ReferenceDot
                x={markerX}
                y={markerY}
                r={5}
                fill="black"
                stroke="none"
                label={{ value: `(${Tstress}\u00B0C, ${markerY.toFixed(2)})`, position: "top" }}
              />
            ) : null}
            {markerX !== undefined ? <ReferenceLine x={markerX} stroke="black" strokeDasharray="3 3" /> : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
