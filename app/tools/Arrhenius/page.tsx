"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { kB_eV } from "@/lib/constants";
import { toKelvinFromCelsius } from "@/lib/units";
import { formatSig } from "@/lib/format";
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
import ContactCTA from "@/components/ContactCTA";
import RelatedLinks from "@/components/RelatedLinks";

type SolveTarget = "Ea" | "Tuse" | "Tstress" | "useHours" | "testHours";

const DEFAULTS: Record<SolveTarget, string> & { solveFor: SolveTarget } = {
  Ea: "0.7",
  Tuse: "50",
  Tstress: "100",
  useHours: "8000",
  testHours: "500",
  solveFor: "Tstress",
};

const FIELDS: Array<{ id: SolveTarget; label: string; hint?: string }> = [
  { id: "Ea", label: "Activation Energy (eV)", hint: "Not sure? 0.7 eV is a common starting point." },
  { id: "Tuse", label: "Use Temp (°C)" },
  { id: "Tstress", label: "Stress Temp (°C)" },
  { id: "useHours", label: "Use Life (hrs)" },
  { id: "testHours", label: "Test Duration (hrs)" },
];

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

function validateField(id: SolveTarget, value: number): string | undefined {
  switch (id) {
    case "Ea":
      if (!Number.isFinite(value)) return "Activation energy is required.";
      if (value < 0.1 || value > 2.5) return "Activation energy must be in 0.1-2.5 eV.";
      return undefined;
    case "Tuse":
      if (!Number.isFinite(value)) return "Use temperature is required.";
      if (value < -80 || value > 250) return "Use temperature must be between -80 and 250 °C.";
      return undefined;
    case "Tstress":
      if (!Number.isFinite(value)) return "Stress temperature is required.";
      if (value < -80 || value > 250) return "Stress temperature must be between -80 and 250 °C.";
      return undefined;
    case "useHours":
      return Number.isFinite(value) && value > 0 ? undefined : "Use life must be > 0.";
    case "testHours":
      return Number.isFinite(value) && value > 0 ? undefined : "Test duration must be > 0.";
  }
}

function initialInputs(): Record<SolveTarget, string> {
  return {
    Ea: DEFAULTS.Ea,
    Tuse: DEFAULTS.Tuse,
    Tstress: DEFAULTS.Tstress,
    useHours: DEFAULTS.useHours,
    testHours: DEFAULTS.testHours,
  };
}

export default function ArrheniusCalculator() {
  const [raw, setRaw] = useState<Record<SolveTarget, string>>(initialInputs);
  const [solveFor, setSolveFor] = useState<SolveTarget>(DEFAULTS.solveFor);

  // Only the fields the user types into are validated. The solved field is an
  // output, so a stale or out-of-range value there must never block the solver.
  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<SolveTarget, string>> = {};
    for (const { id } of FIELDS) {
      if (id === solveFor) continue;
      const message = validateField(id, raw[id].trim() === "" ? NaN : Number(raw[id]));
      if (message) errors[id] = message;
    }
    return errors;
  }, [raw, solveFor]);

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  const solved = useMemo((): { value: number; error: string } => {
    if (hasFieldErrors) return { value: NaN, error: "" };

    const Ea = Number(raw.Ea);
    const TuseK = toKelvinFromCelsius(Number(raw.Tuse));
    const TstressK = toKelvinFromCelsius(Number(raw.Tstress));
    const useH = Number(raw.useHours);
    const testH = Number(raw.testHours);
    const fail = (error: string) => ({ value: NaN, error });

    if (solveFor === "testHours" || solveFor === "useHours") {
      const af = Math.exp((Ea / kB_eV) * (1 / TuseK - 1 / TstressK));
      if (!Number.isFinite(af) || af <= 0) return fail("Unable to compute the acceleration factor from these inputs.");
      return { value: solveFor === "testHours" ? useH / af : af * testH, error: "" };
    }

    const af = useH / testH;

    if (solveFor === "Tstress") {
      if (af <= 1) return fail("Test Duration must be shorter than Use Life for the test to be accelerated.");
      const inverse = 1 / TuseK - (kB_eV / Ea) * Math.log(af);
      if (inverse <= 0) {
        return fail("That much acceleration is not reachable at any temperature with this activation energy.");
      }
      return { value: 1 / inverse - 273.15, error: "" };
    }

    if (solveFor === "Tuse") {
      const nextK = 1 / (1 / TstressK + (kB_eV / Ea) * Math.log(af));
      if (!Number.isFinite(nextK) || nextK <= 0) return fail("Unable to solve Use Temp with these inputs.");
      return { value: nextK - 273.15, error: "" };
    }

    // Activation energy
    const denominator = 1 / TuseK - 1 / TstressK;
    if (denominator === 0) return fail("Use and Stress temperatures must differ to solve for activation energy.");
    const nextEa = (kB_eV * Math.log(af)) / denominator;
    if (!Number.isFinite(nextEa) || nextEa <= 0) {
      return fail("No positive activation energy fits these inputs. A shorter test needs Stress Temp above Use Temp.");
    }
    return { value: nextEa, error: "" };
  }, [raw, solveFor, hasFieldErrors]);

  const solvedText = formatSig(solved.value);

  // Effective numeric value of every field: typed inputs plus the solved one.
  const num = (id: SolveTarget) => (id === solveFor ? solved.value : Number(raw[id]));
  const EaNum = num("Ea");
  const TuseC = num("Tuse");
  const TstressC = num("Tstress");
  const useHoursNum = num("useHours");
  const testHoursNum = num("testHours");
  const ready = !hasFieldErrors && Number.isFinite(solved.value);

  const af = useMemo(() => {
    if (!ready) return NaN;
    return Math.exp((EaNum / kB_eV) * (1 / toKelvinFromCelsius(TuseC) - 1 / toKelvinFromCelsius(TstressC)));
  }, [ready, EaNum, TuseC, TstressC]);

  const afGraphData = useMemo(() => {
    if (!ready) return [];
    const TuseK = toKelvinFromCelsius(TuseC);
    const start = Math.floor(Math.min(TuseC, TstressC) / 5) * 5;
    const end = Math.max(start + 50, Math.ceil((Math.max(TuseC, TstressC) + 20) / 5) * 5);
    const points: Array<{ stressTemp: number; AF: number }> = [];
    for (let t = start; t <= end; t += 5) {
      const value = Math.exp((EaNum / kB_eV) * (1 / TuseK - 1 / toKelvinFromCelsius(t)));
      points.push({ stressTemp: t, AF: Number(value.toPrecision(5)) });
    }
    return points;
  }, [ready, EaNum, TuseC, TstressC]);

  const warnings: string[] = [];
  if (ready && af <= 1) {
    warnings.push(
      "The acceleration factor is 1 or less, so this test is not accelerated. Stress Temp must be above Use Temp."
    );
  }
  if (ready && (solveFor === "Tstress" || solveFor === "Tuse") && (solved.value < -80 || solved.value > 250)) {
    warnings.push(
      "The solved temperature is outside -80 to 250 °C. At extremes like this the failure mechanism usually changes, so the Arrhenius model may no longer apply."
    );
  }
  if (ready && solveFor === "Ea" && (solved.value < 0.1 || solved.value > 2.5)) {
    warnings.push(
      "The solved activation energy is outside the usual 0.1-2.5 eV range. Double-check the temperatures and durations."
    );
  }

  const changeSolveFor = (next: SolveTarget) => {
    if (next === solveFor) return;
    // Keep the answer just computed as the starting value of the field it was in.
    // Carried at higher precision than displayed so the next answer does not drift.
    if (solvedText) setRaw((prev) => ({ ...prev, [solveFor]: formatSig(solved.value, 10) }));
    setSolveFor(next);
  };

  const resetInputs = () => {
    setRaw(initialInputs());
    setSolveFor(DEFAULTS.solveFor);
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

      <p className="mb-3 text-sm text-gray-700">
        Select the value you want to find, then fill in the other four. The answer updates as you type.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map(({ id, label, hint }) => {
          const isSolved = solveFor === id;
          return (
            <div key={id} className={`rounded text-sm ${isSolved ? "border-l-4 border-yellow-400 bg-yellow-50 p-2" : ""}`}>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="solveFor"
                  value={id}
                  checked={isSolved}
                  onChange={() => changeSolveFor(id)}
                  className="mr-2"
                  aria-label={`Solve for ${label}`}
                />
                <span>{label}</span>
                {isSolved ? <span className="ml-2 text-xs font-medium text-yellow-800">calculated</span> : null}
              </label>
              <input
                type="number"
                aria-label={label}
                value={isSolved ? solvedText : raw[id]}
                onChange={(e) => setRaw((prev) => ({ ...prev, [id]: e.target.value }))}
                disabled={isSolved}
                className={`mt-1 w-full rounded border p-2 ${fieldErrors[id] ? "border-red-500" : ""}`}
              />
              {fieldErrors[id] ? <p className="mt-1 text-xs text-red-700">{fieldErrors[id]}</p> : null}
              {!fieldErrors[id] && hint && !isSolved ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
        <p className="text-lg font-semibold">Acceleration factor (AF): {ready ? formatSig(af) : "N/A"}</p>
        {ready ? (
          <p className="mt-1 text-sm">
            {formatSig(testHoursNum)} hours of testing at {formatSig(TstressC)}&deg;C is equivalent to{" "}
            {formatSig(useHoursNum)} hours of use at {formatSig(TuseC)}&deg;C (E<sub>a</sub> = {formatSig(EaNum)} eV).
          </p>
        ) : (
          <p className="mt-1 text-sm">{solved.error || "Fix the highlighted inputs above to see the result."}</p>
        )}
      </div>
      {warnings.map((warning) => (
        <div key={warning} className="mt-4 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
          {warning}
        </div>
      ))}

      <div className="mt-8 h-80 rounded border bg-white p-4 shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={afGraphData} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="stressTemp"
              type="number"
              domain={["dataMin", "dataMax"]}
              label={{ value: "Stress Temp (°C)", position: "insideBottom", offset: -5 }}
            />
            <YAxis label={{ value: "AF", angle: -90, position: "insideLeft" }} />
            <RechartTooltip labelFormatter={(value) => `${value} °C`} />
            <Line type="monotone" dataKey="AF" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />
            {ready ? <ReferenceLine x={TstressC} stroke="black" strokeDasharray="3 3" /> : null}
            {ready ? (
              <ReferenceDot
                x={TstressC}
                y={af}
                r={5}
                fill="black"
                stroke="none"
                label={{ value: `${formatSig(TstressC, 4)}°C, AF ${formatSig(af, 4)}`, position: "top" }}
              />
            ) : null}
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
          <Link href="/tools/CoffinManson/" className="text-blue-600 hover:underline">
            Coffin-Manson calculator
          </Link>
          ; to turn an AF into a screening plan, see the{" "}
          <Link href="/tools/BurnInWizard/" className="text-blue-600 hover:underline">
            Burn-In Wizard
          </Link>
          .
        </p>
      </section>
      <RelatedLinks route="/tools/Arrhenius/" />
    </div>
  );
}
