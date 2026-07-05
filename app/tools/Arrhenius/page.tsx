"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { kB_eV } from "@/lib/constants";
import { toKelvinFromCelsius } from "@/lib/units";
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
import ContactCTA from "@/components/ContactCTA";

const DEFAULTS = {
  Ea: "0.7",
  Tuse: "50",
  Tstress: "100",
  useHours: "8000",
  testHours: "500",
  solveFor: "Tstress" as SolveTarget,
};

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

export default function ArrheniusCalculator() {
  const [Ea, setEa] = useState(DEFAULTS.Ea);
  const [Tuse, setTuse] = useState(DEFAULTS.Tuse);
  const [Tstress, setTstress] = useState(DEFAULTS.Tstress);
  const [useHours, setUseHours] = useState(DEFAULTS.useHours);
  const [testHours, setTestHours] = useState(DEFAULTS.testHours);
  const [solveFor, setSolveFor] = useState<SolveTarget>(DEFAULTS.solveFor);
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

  const TuseK = toKelvinFromCelsius(TuseCNum);
  const TstressK = toKelvinFromCelsius(TstressCNum);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<SolveTarget, string>> = {};
    if (!Number.isFinite(EaNum)) {
      errors.Ea = "Activation energy is required.";
    } else if (EaNum < 0.1 || EaNum > 2.5) {
      errors.Ea = "Activation energy must be in 0.1-2.5 eV.";
    }

    if (!Number.isFinite(TuseCNum)) {
      errors.Tuse = "Use temperature is required.";
    } else if (TuseCNum < -80 || TuseCNum > 250) {
      errors.Tuse = "Use temperature must be between -80 and 250 C.";
    }

    if (!Number.isFinite(TstressCNum)) {
      errors.Tstress = "Stress temperature is required.";
    } else if (TstressCNum < -80 || TstressCNum > 250) {
      errors.Tstress = "Stress temperature must be between -80 and 250 C.";
    }

    if (!Number.isFinite(useHoursNum) || useHoursNum <= 0) {
      errors.useHours = "Use life must be > 0.";
    }

    if (!Number.isFinite(testHoursNum) || testHoursNum <= 0) {
      errors.testHours = "Test duration must be > 0.";
    }

    return errors;
  }, [EaNum, TuseCNum, TstressCNum, useHoursNum, testHoursNum]);

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  const arrheniusAF = useMemo(() => {
    if (!Number.isFinite(EaNum) || EaNum <= 0) return NaN;
    if (!Number.isFinite(TuseK) || !Number.isFinite(TstressK) || TuseK <= 0 || TstressK <= 0) return NaN;
    return Math.exp((EaNum / kB_eV) * (1 / TuseK - 1 / TstressK));
  }, [EaNum, TuseK, TstressK]);

  const timeRatioAF = useMemo(() => {
    if (!Number.isFinite(useHoursNum) || !Number.isFinite(testHoursNum) || testHoursNum <= 0) return NaN;
    return useHoursNum / testHoursNum;
  }, [useHoursNum, testHoursNum]);

  const afMismatchRatio = useMemo(() => {
    if (!Number.isFinite(arrheniusAF) || !Number.isFinite(timeRatioAF) || timeRatioAF <= 0) return NaN;
    return Math.abs(arrheniusAF - timeRatioAF) / timeRatioAF;
  }, [arrheniusAF, timeRatioAF]);

  useEffect(() => {
    setSolverError("");

    if (hasFieldErrors) {
      setSolverError("Please fix input validation errors.");
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

      const nextTstressK = 1 / ((1 / TuseK) - (kB_eV / EaNum) * Math.log(AF));
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

      const nextTuseK = 1 / ((1 / TstressK) + (kB_eV / EaNum) * Math.log(AF));
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

      const nextEa = (kB_eV * Math.log(AF)) / denominator;
      if (!Number.isFinite(nextEa) || nextEa <= 0) {
        setSolverError("Computed Activation Energy is not physically valid.");
        return;
      }

      setEa(formatNum(nextEa));
    }
  }, [EaNum, TuseK, TstressK, useHoursNum, testHoursNum, solveFor, arrheniusAF, hasFieldErrors]);

  const afGraphData = useMemo(() => {
    if (!Number.isFinite(EaNum) || EaNum <= 0 || !Number.isFinite(TuseK) || TuseK <= 0) return [];

    const start = 25;
    const endFromInput = Number.isFinite(TstressCNum) ? TstressCNum + 20 : 125;
    const end = Math.max(start + 10, endFromInput);
    const points: Array<{ stressTemp: number; AF: number }> = [];

    for (let stressTempC = start; stressTempC <= end; stressTempC += 5) {
      const stressTempK = toKelvinFromCelsius(stressTempC);
      const af = Math.exp((EaNum / kB_eV) * (1 / TuseK - 1 / stressTempK));
      points.push({ stressTemp: stressTempC, AF: parseFloat(af.toFixed(2)) });
    }

    return points;
  }, [EaNum, TuseK, TstressCNum]);

  const markerX = Number.isFinite(TstressCNum) ? TstressCNum : undefined;
  const markerY = Number.isFinite(arrheniusAF) ? arrheniusAF : undefined;
  const showNonAcceleratingWarning = Number.isFinite(arrheniusAF) && arrheniusAF <= 1;
  const showAfMismatchWarning = Number.isFinite(afMismatchRatio) && afMismatchRatio > 0.1;

  const resetInputs = () => {
    setEa(DEFAULTS.Ea);
    setTuse(DEFAULTS.Tuse);
    setTstress(DEFAULTS.Tstress);
    setUseHours(DEFAULTS.useHours);
    setTestHours(DEFAULTS.testHours);
    setSolveFor(DEFAULTS.solveFor);
    setSolverError("");
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Arrhenius Acceleration Factor Calculator</h1>
        <button
          type="button"
          onClick={resetInputs}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Reset
        </button>
      </div>

      <div className="mb-6 rounded border bg-gray-50 p-4">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
          <div className="flex-1">
            <BlockMath math={"AF = e^{\\left(\\frac{E_a}{k}\\left(\\frac{1}{T_{use}} - \\frac{1}{T_{stress}}\\right)\\right)}"} />
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <strong>E<sub>a</sub></strong> = Activation energy (eV)
              </li>
              <li>
                <strong>k</strong> = Boltzmann constant = 8.617333262145e-5 eV/K
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
          {
            label: "Activation Energy (eV)",
            value: Ea,
            setter: setEa,
            id: "Ea" as const,
            tooltip: "Typical 0.4-1.2 for polymers.",
          },
          { label: "Use Temp (\u00B0C)", value: Tuse, setter: setTuse, id: "Tuse" as const },
          { label: "Stress Temp (\u00B0C)", value: Tstress, setter: setTstress, id: "Tstress" as const },
          { label: "Use Life (hrs)", value: useHours, setter: setUseHours, id: "useHours" as const },
          { label: "Test Duration (hrs)", value: testHours, setter: setTestHours, id: "testHours" as const },
        ].map(({ label, value, setter, id, tooltip }) => (
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
            <span title={tooltip}>{label}</span>
            <input
              type="number"
              value={value}
              onChange={(e) => setter(e.target.value)}
              disabled={solveFor === id}
              className={`mt-1 w-full rounded border p-2 ${fieldErrors[id] ? "border-red-500" : ""}`}
            />
            {fieldErrors[id] ? <p className="mt-1 text-xs text-red-700">{fieldErrors[id]}</p> : null}
          </label>
        ))}
      </div>

      <div className="mt-6 rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
        <p className="text-lg font-semibold">
          AF from durations (Use Life / Test Duration): {Number.isFinite(timeRatioAF) ? formatNum(timeRatioAF) : "N/A"}
        </p>
        <p className="mt-1 text-sm">
          AF from Arrhenius equation (Ea + temperatures): {Number.isFinite(arrheniusAF) ? formatNum(arrheniusAF) : "N/A"}
        </p>
        <p className="mt-1 text-sm">
          To simulate {useHours} hours of use at {Tuse}&deg;C, test for {testHours} hours at {Tstress}&deg;C.
        </p>
        {solverError ? <p className="mt-2 text-sm text-red-700">{solverError}</p> : null}
      </div>
      {showNonAcceleratingWarning ? (
        <div className="mt-4 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
          AF is {formatNum(arrheniusAF)} (&lt;= 1). This condition is not accelerating.
        </div>
      ) : null}
      {showAfMismatchWarning ? (
        <div className="mt-4 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
          AF from durations and AF from Arrhenius differ by more than 10%. Check units, temperatures, and assumed Ea.
        </div>
      ) : null}

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

      <ContactCTA variant="tool" />

      <section className="mt-12 border-t pt-8 text-sm text-gray-600">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">How it works</h2>
        <p className="mb-4">
          The Arrhenius acceleration factor (AF) tells you how much faster a thermally activated failure mechanism
          ages at an elevated test temperature versus normal use:
        </p>
        <BlockMath math={"AF = \\exp\\left[\\frac{E_a}{k}\\left(\\frac{1}{T_{use}} - \\frac{1}{T_{stress}}\\right)\\right]"} />
        <p className="mb-4">
          where <strong>E<sub>a</sub></strong> is the activation energy (eV), <strong>k</strong> is
          Boltzmann&apos;s constant (8.617 &times; 10<sup>&minus;5</sup> eV/K), and temperatures are in{" "}
          <strong>kelvin</strong> (&deg;C + 273.15).
        </p>
        <p className="mb-4">
          <strong>Example:</strong> A part used at 55&nbsp;&deg;C and tested at 125&nbsp;&deg;C, with E
          <sub>a</sub>&nbsp;=&nbsp;0.7&nbsp;eV, gives <strong>AF &asymp; 78</strong> &mdash; one test hour
          equals about 78 field hours. Use the radio buttons to solve for any field instead: targeting a
          175&times; acceleration from a 55&nbsp;&deg;C baseline requires a stress temperature of about{" "}
          <strong>141&nbsp;&deg;C</strong>.
        </p>
        <p>
          Use this for diffusion- and reaction-driven wear-out. For fatigue or thermal-cycling failures, use the{" "}
          <Link href="/tools/CoffinManson" className="text-blue-600 hover:underline">
            Coffin-Manson calculator
          </Link>
          ; to turn an AF into a screening plan, see the{" "}
          <Link href="/tools/BurnInWizard" className="text-blue-600 hover:underline">
            Burn-In Wizard
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
