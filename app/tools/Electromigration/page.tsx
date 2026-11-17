"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { computeElectromigrationMTTF } from "@/lib/reliabilityMath";
import { kB_eV } from "@/lib/constants";
import { toKelvinFromCelsius } from "@/lib/units";
import { formatSig } from "@/lib/format";
import ContactCTA from "@/components/ContactCTA";

type SolveTarget = "MTTF" | "j" | "T";
type CurrentDensityUnit = "A/cm2" | "A/m2";

const DEFAULTS = {
  solveFor: "MTTF" as SolveTarget,
  Ea: "0.7",
  currentDensity: "100000",
  currentDensityUnit: "A/cm2" as CurrentDensityUnit,
  temperatureC: "125",
  n: "1.2",
  A: "1",
  MTTF: "1000",
};

const SuggestedTable = () => (
  <table className="w-auto border text-left text-xs">
    <thead className="bg-gray-100">
      <tr>
        <th className="border px-2 py-1">Material</th>
        <th className="border px-2 py-1">Ea (eV)</th>
        <th className="border px-2 py-1">n</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="border px-2 py-1">Aluminum</td>
        <td className="border px-2 py-1">0.5-0.7</td>
        <td className="border px-2 py-1">1-2</td>
      </tr>
      <tr>
        <td className="border px-2 py-1">Copper</td>
        <td className="border px-2 py-1">0.7-1.0</td>
        <td className="border px-2 py-1">1-2</td>
      </tr>
      <tr>
        <td className="border px-2 py-1">Silver</td>
        <td className="border px-2 py-1">~0.6</td>
        <td className="border px-2 py-1">1-2</td>
      </tr>
    </tbody>
  </table>
);

function fromDisplayCurrentDensity(value: number, unit: CurrentDensityUnit): number {
  if (unit === "A/m2") {
    return value / 10000;
  }
  return value;
}

function toDisplayCurrentDensity(valueAcm2: number, unit: CurrentDensityUnit): number {
  if (unit === "A/m2") {
    return valueAcm2 * 10000;
  }
  return valueAcm2;
}

export default function ElectromigrationCalculator() {
  const [solveFor, setSolveFor] = useState<SolveTarget>(DEFAULTS.solveFor);
  const [Ea, setEa] = useState(DEFAULTS.Ea);
  const [currentDensity, setCurrentDensity] = useState(DEFAULTS.currentDensity);
  const [currentDensityUnit, setCurrentDensityUnit] = useState<CurrentDensityUnit>(DEFAULTS.currentDensityUnit);
  const [temperatureC, setTemperatureC] = useState(DEFAULTS.temperatureC);
  const [n, setN] = useState(DEFAULTS.n);
  const [A, setA] = useState(DEFAULTS.A);
  const [MTTF, setMTTF] = useState(DEFAULTS.MTTF);

  const EaNum = Number(Ea);
  const nNum = Number(n);
  const AVal = Number(A);
  const tempC = Number(temperatureC);
  const mttfNum = Number(MTTF);
  const currentDensityDisplay = Number(currentDensity);
  const currentDensityAcm2 = fromDisplayCurrentDensity(currentDensityDisplay, currentDensityUnit);
  const nPositive = Math.abs(nNum);

  // The solved field is an output, so it is never validated: a stale value in
  // it must not block the calculation.
  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"Ea" | "j" | "T" | "n" | "A" | "MTTF", string>> = {};

    if (Ea.trim() === "" || !Number.isFinite(EaNum)) {
      errors.Ea = "Activation energy is required.";
    } else if (EaNum < 0.1 || EaNum > 2.5) {
      errors.Ea = "Activation energy must be between 0.1 and 2.5 eV.";
    }

    if (solveFor !== "j" && (!Number.isFinite(currentDensityDisplay) || currentDensityDisplay <= 0)) {
      errors.j = "Current density must be > 0.";
    }

    if (solveFor !== "T" && (temperatureC.trim() === "" || !Number.isFinite(tempC) || tempC < -80 || tempC > 300)) {
      errors.T = "Temperature must be between -80 and 300 °C.";
    }

    if (!Number.isFinite(nNum) || nNum === 0) {
      errors.n = "n must be non-zero.";
    }

    if (!Number.isFinite(AVal) || AVal <= 0) {
      errors.A = "A must be > 0.";
    }

    if (solveFor !== "MTTF" && (!Number.isFinite(mttfNum) || mttfNum <= 0)) {
      errors.MTTF = "MTTF must be > 0.";
    }

    return errors;
  }, [Ea, EaNum, currentDensityDisplay, temperatureC, tempC, nNum, AVal, mttfNum, solveFor]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const solved = useMemo((): { label: string; value: string; num: number; error: string } => {
    const label =
      solveFor === "MTTF" ? "MTTF (hrs)" : solveFor === "j" ? `Current Density (${currentDensityUnit})` : "Temperature (°C)";
    if (hasErrors) {
      return { label, value: "", num: NaN, error: "Fix the highlighted inputs above to see the result." };
    }

    try {
      if (solveFor === "MTTF") {
        const value = computeElectromigrationMTTF(AVal, currentDensityAcm2, nPositive, EaNum, tempC);
        return { label, value: formatSig(value), num: value, error: "" };
      }

      if (solveFor === "j") {
        const tK = toKelvinFromCelsius(tempC);
        const numerator = AVal * Math.exp(EaNum / (kB_eV * tK));
        const valueAcm2 = Math.pow(numerator / mttfNum, 1 / nPositive);
        const displayValue = toDisplayCurrentDensity(valueAcm2, currentDensityUnit);
        if (!Number.isFinite(displayValue) || displayValue <= 0) {
          return { label, value: "", num: NaN, error: "Cannot solve current density with these inputs." };
        }
        return { label, value: formatSig(displayValue), num: displayValue, error: "" };
      }

      const lnPart = Math.log(mttfNum / (AVal * Math.pow(currentDensityAcm2, -nPositive)));
      if (!Number.isFinite(lnPart) || lnPart <= 0) {
        return {
          label,
          value: "",
          num: NaN,
          error: "No temperature gives that MTTF at this current density. Try a longer MTTF or a lower current density.",
        };
      }
      const solvedTempC = EaNum / (kB_eV * lnPart) - 273.15;
      return { label, value: formatSig(solvedTempC), num: solvedTempC, error: "" };
    } catch (error) {
      return { label, value: "", num: NaN, error: error instanceof Error ? error.message : "Calculation failed." };
    }
  }, [hasErrors, solveFor, AVal, currentDensityAcm2, nPositive, EaNum, tempC, mttfNum, currentDensityUnit]);

  // Effective operating point: typed inputs plus whichever value was solved.
  const ready = !hasErrors && Number.isFinite(solved.num);
  const effTempC = solveFor === "T" ? solved.num : tempC;
  const effMttf = solveFor === "MTTF" ? solved.num : mttfNum;
  const effJAcm2 = solveFor === "j" ? fromDisplayCurrentDensity(solved.num, currentDensityUnit) : currentDensityAcm2;

  const graphData = useMemo(() => {
    if (!ready) return [];
    const start = Math.min(50, Math.floor(effTempC / 5) * 5 - 10);
    const end = Math.max(200, Math.ceil(effTempC / 5) * 5 + 10);
    const data: Array<{ temp: number; mttf: number }> = [];
    for (let temp = start; temp <= end; temp += 5) {
      const mttf = AVal * Math.pow(effJAcm2, -nPositive) * Math.exp(EaNum / (kB_eV * toKelvinFromCelsius(temp)));
      if (Number.isFinite(mttf) && mttf > 0) {
        data.push({ temp, mttf });
      }
    }
    return data;
  }, [ready, AVal, effJAcm2, nPositive, EaNum, effTempC]);

  const changeSolveFor = (next: SolveTarget) => {
    if (next === solveFor) return;
    // Keep the answer just computed as the starting value of the field it was in.
    // Carried at higher precision than displayed so the next answer does not drift.
    if (solved.value) {
      const carried = formatSig(solved.num, 10);
      if (solveFor === "MTTF") setMTTF(carried);
      if (solveFor === "j") setCurrentDensity(carried);
      if (solveFor === "T") setTemperatureC(carried);
    }
    setSolveFor(next);
  };

  const changeUnit = (next: CurrentDensityUnit) => {
    if (next === currentDensityUnit) return;
    // Convert the typed value so the physical current density stays the same.
    if (Number.isFinite(currentDensityDisplay) && currentDensity.trim() !== "") {
      setCurrentDensity(formatSig(toDisplayCurrentDensity(currentDensityAcm2, next), 8));
    }
    setCurrentDensityUnit(next);
  };

  const downloadCSV = () => {
    let csv = "Temperature (C),MTTF (hours)\n";
    graphData.forEach((row) => {
      csv += `${row.temp},${row.mttf}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "electromigration_mttf.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetInputs = () => {
    setSolveFor(DEFAULTS.solveFor);
    setEa(DEFAULTS.Ea);
    setCurrentDensity(DEFAULTS.currentDensity);
    setCurrentDensityUnit(DEFAULTS.currentDensityUnit);
    setTemperatureC(DEFAULTS.temperatureC);
    setN(DEFAULTS.n);
    setA(DEFAULTS.A);
    setMTTF(DEFAULTS.MTTF);
  };

  const nWasNegative = Number.isFinite(nNum) && nNum < 0;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Electromigration MTTF Calculator — Black's Equation</h1>
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
            <BlockMath math={"MTTF = A \\cdot j^{-n} \\cdot e^{\\frac{E_a}{kT}}"} />
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <strong>MTTF</strong> = Mean Time To Failure (hours)
              </li>
              <li>
                <strong>A</strong> = Process constant (results are relative unless A is calibrated)
              </li>
              <li>
                <strong>j</strong> = Current density
              </li>
              <li title="n (positive); typical 1-2">
                <strong>n</strong> = Current density exponent (positive)
              </li>
              <li title="Activation energy in eV">
                <strong>Ea</strong> = Activation energy (eV)
              </li>
              <li>
                <strong>T</strong> = Temperature (K)
              </li>
              <li>
                <strong>k</strong> = Boltzmann constant = 8.617333262145e-5 eV/K
              </li>
            </ul>
          </div>
          <div className="mt-4 w-full md:mt-0 md:w-auto">
            <SuggestedTable />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium">
          Current Density Unit
          <select
            value={currentDensityUnit}
            onChange={(event) => changeUnit(event.target.value as CurrentDensityUnit)}
            className="mt-1 w-full rounded border p-2 sm:w-48"
          >
            <option value="A/cm2">A/cm²</option>
            <option value="A/m2">A/m²</option>
          </select>
        </label>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "MTTF (hrs)", value: MTTF, setter: setMTTF, id: "MTTF" as const, errorKey: "MTTF" as const, solveId: "MTTF" as const },
          {
            label: `Current Density (${currentDensityUnit})`,
            value: currentDensity,
            setter: setCurrentDensity,
            id: "j" as const,
            errorKey: "j" as const,
            solveId: "j" as const,
          },
          {
            label: "Temperature (°C)",
            value: temperatureC,
            setter: setTemperatureC,
            id: "T" as const,
            errorKey: "T" as const,
            solveId: "T" as const,
          },
          { label: "Activation Energy (eV)", value: Ea, setter: setEa, id: "Ea" as const, errorKey: "Ea" as const },
          { label: "Current density exponent (n)", value: n, setter: setN, id: "n" as const, errorKey: "n" as const },
          { label: "Constant A (leave at 1 to compare cases)", value: A, setter: setA, id: "A" as const, errorKey: "A" as const },
        ].map(({ label, value, setter, id, errorKey, solveId }) => (
          <label key={id} className={`block text-sm ${solveFor === id ? "rounded border-l-4 border-yellow-400 bg-yellow-50 p-2" : ""}`}>
            {solveId ? (
              <input
                type="radio"
                name="solveFor"
                value={solveId}
                checked={solveFor === solveId}
                onChange={() => changeSolveFor(solveId)}
                className="mr-2"
              />
            ) : null}
            {label}
            <input
              type="number"
              value={solveId && solveFor === solveId ? solved.value : value}
              onChange={(event) => setter(event.target.value)}
              disabled={Boolean(solveId && solveFor === solveId)}
              className={`mt-1 w-full rounded border p-2 ${fieldErrors[errorKey] ? "border-red-500" : ""}`}
            />
            {fieldErrors[errorKey] ? <p className="mt-1 text-xs text-red-700">{fieldErrors[errorKey]}</p> : null}
          </label>
        ))}
      </div>

      <div className="rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
        <p className="text-lg font-semibold">
          {solved.label}: {solved.value || "N/A"}
        </p>
        {solved.error ? <p className="mt-1 text-sm">{solved.error}</p> : null}
        {ready && AVal === 1 ? (
          <p className="mt-1 text-sm">
            With A = 1 the hours are relative, not absolute. Use them to compare one condition against another, or
            enter a calibrated A from your process data.
          </p>
        ) : null}
      </div>

      {nWasNegative ? (
        <div className="mt-4 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
          The exponent was entered as a negative number; its positive value is used, since the formula already applies
          the minus sign.
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        <div className="h-80 rounded border bg-white p-4 shadow">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="temp"
                type="number"
                domain={["dataMin", "dataMax"]}
                label={{ value: "Temperature (°C)", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                scale="log"
                domain={["auto", "auto"]}
                tickFormatter={(value: number) => formatSig(value, 2)}
                width={70}
                label={{ value: "MTTF (hrs)", angle: -90, position: "insideLeft", offset: -5 }}
              />
              <RechartTooltip
                formatter={(value: number) => [`${formatSig(value, 4)} hrs`, "MTTF"]}
                labelFormatter={(value) => `${value} °C`}
              />
              <Line type="monotone" dataKey="mttf" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />
              {ready ? <ReferenceLine x={effTempC} stroke="black" strokeDasharray="3 3" /> : null}
              {ready ? <ReferenceDot x={effTempC} y={effMttf} r={5} fill="black" stroke="none" /> : null}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <button
          type="button"
          onClick={downloadCSV}
          disabled={graphData.length === 0}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
        >
          Download CSV
        </button>
      </div>

      <ContactCTA variant="tool" />

      <section className="mt-12 border-t pt-8 text-sm text-gray-600">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">How it works</h2>
        <p className="mb-4">
          Black&apos;s equation models electromigration &mdash; the gradual failure of metal interconnects as
          current physically displaces atoms over time. Mean time to failure falls as current density rises and as
          temperature rises:
        </p>
        <BlockMath math={"MTTF = A \\cdot J^{-n} \\cdot \\exp\\!\\left(\\frac{E_a}{k T}\\right)"} />
        <p className="mb-4">
          where <strong>J</strong> is current density, <strong>n</strong> is the current-density exponent
          (typically 1&ndash;2), <strong>E<sub>a</sub></strong> is activation energy (eV), <strong>k</strong> is
          Boltzmann&apos;s constant, and <strong>T</strong> is temperature in kelvin.
        </p>
        <p className="mb-4">
          <strong>Example:</strong> With n&nbsp;=&nbsp;2, doubling current density cuts life to one-quarter
          (<strong>AF = 2&sup2; = 4</strong>). Separately, raising temperature from 105&nbsp;&deg;C to
          150&nbsp;&deg;C at E<sub>a</sub>&nbsp;=&nbsp;0.9&nbsp;eV gives a thermal acceleration of about{" "}
          <strong>19&times;</strong>. The two effects multiply, so current and temperature together drive
          electromigration life hard.
        </p>
        <p>
          Use this when sizing metal traces, vias, or bond wires for long-term current loading. For thermally
          activated chemical wear-out, see the{" "}
          <Link href="/tools/Arrhenius/" className="text-blue-600 hover:underline">
            Arrhenius calculator
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
