"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { computeCoffinMansonCyclesToFailure } from "@/lib/reliabilityMath";
import ContactCTA from "@/components/ContactCTA";

type SolveTarget = "Nf" | "A" | "deltaEps" | "c";

const DEFAULTS = {
  A: "100000",
  c: "2",
  deltaEps: "0.005",
  Nf: "4000000000",
  solveFor: "Nf" as SolveTarget,
};

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(6).replace(/\.?0+$/, "");
}

export default function CoffinMansonCalculator() {
  const [A, setA] = useState(DEFAULTS.A);
  const [c, setC] = useState(DEFAULTS.c);
  const [deltaEps, setDeltaEps] = useState(DEFAULTS.deltaEps);
  const [Nf, setNf] = useState(DEFAULTS.Nf);
  const [solveFor, setSolveFor] = useState<SolveTarget>(DEFAULTS.solveFor);

  const AVal = Number(A);
  const cInput = Number(c);
  const cPositive = Math.abs(cInput);
  const deltaVal = Number(deltaEps);
  const nfVal = Number(Nf);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<SolveTarget, string>> = {};

    if (!Number.isFinite(AVal) || AVal <= 0) {
      errors.A = "A must be > 0.";
    }
    if (!Number.isFinite(cInput) || cInput === 0) {
      errors.c = "c must be non-zero.";
    } else if (cPositive > 20) {
      errors.c = "c looks too large; check units.";
    }
    if (!Number.isFinite(deltaVal) || deltaVal <= 0 || deltaVal >= 1) {
      errors.deltaEps = "Delta strain must be between 0 and 1 (exclusive).";
    }
    if (!Number.isFinite(nfVal) || nfVal <= 0) {
      errors.Nf = "Nf must be > 0.";
    }

    return errors;
  }, [AVal, cInput, cPositive, deltaVal, nfVal]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const solved = useMemo(() => {
    if (hasErrors) {
      return { value: "", error: "" };
    }

    try {
      if (solveFor === "Nf") {
        return { value: formatValue(computeCoffinMansonCyclesToFailure(AVal, cPositive, deltaVal)), error: "" };
      }
      if (solveFor === "A") {
        const value = nfVal * Math.pow(deltaVal, cPositive);
        return { value: formatValue(value), error: "" };
      }
      if (solveFor === "deltaEps") {
        const value = Math.pow(AVal / nfVal, 1 / cPositive);
        return { value: formatValue(value), error: "" };
      }
      const denominator = Math.log(deltaVal);
      if (denominator === 0) {
        return { value: "", error: "Cannot solve c when delta strain equals 1." };
      }
      const value = Math.log(AVal / nfVal) / denominator;
      return { value: formatValue(Math.abs(value)), error: "" };
    } catch (error) {
      return { value: "", error: error instanceof Error ? error.message : "Calculation failed." };
    }
  }, [hasErrors, solveFor, AVal, cPositive, deltaVal, nfVal]);

  const graphData = useMemo(() => {
    if (hasErrors) return [];
    const points: Array<{ deltaEps: number; Nf: number }> = [];
    for (let eps = 0.001; eps <= 0.02; eps += 0.001) {
      const cycles = computeCoffinMansonCyclesToFailure(AVal, cPositive, eps);
      if (Number.isFinite(cycles) && cycles > 0) {
        points.push({
          deltaEps: Number(eps.toFixed(4)),
          Nf: Number(cycles.toFixed(4)),
        });
      }
    }
    return points;
  }, [hasErrors, AVal, cPositive]);

  const applySolvedValue = () => {
    if (!solved.value) return;
    if (solveFor === "Nf") setNf(solved.value);
    if (solveFor === "A") setA(solved.value);
    if (solveFor === "deltaEps") setDeltaEps(solved.value);
    if (solveFor === "c") setC(solved.value);
  };

  const resetInputs = () => {
    setA(DEFAULTS.A);
    setC(DEFAULTS.c);
    setDeltaEps(DEFAULTS.deltaEps);
    setNf(DEFAULTS.Nf);
    setSolveFor(DEFAULTS.solveFor);
  };

  const cWasNegative = Number.isFinite(cInput) && cInput < 0;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Coffin-Manson Thermal Fatigue Calculator</h1>
        <button
          type="button"
          onClick={resetInputs}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Reset
        </button>
      </div>

      <div className="mb-6 rounded border bg-gray-50 p-4">
        <BlockMath math={"N_f = A\\,(\\Delta\\varepsilon)^{-c}"} />
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          <li>
            <strong>Nf</strong> = cycles to failure
          </li>
          <li>
            <strong>A</strong> = material constant
          </li>
          <li>
            <strong>Delta eps</strong> = strain range
          </li>
          <li title="c (positive)">
            <strong>c</strong> = Coffin-Manson exponent (positive)
          </li>
        </ul>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { id: "Nf" as const, label: "Cycles to Failure (Nf)", value: Nf, setter: setNf },
          { id: "A" as const, label: "A Constant", value: A, setter: setA },
          { id: "deltaEps" as const, label: "Delta Strain (Delta eps)", value: deltaEps, setter: setDeltaEps },
          { id: "c" as const, label: "c (positive)", value: c, setter: setC, tooltip: "Use a positive value; typical engineering fits are > 0." },
        ].map(({ id, label, value, setter, tooltip }) => (
          <label key={id} className={`block text-sm ${solveFor === id ? "rounded border-l-4 border-yellow-400 bg-yellow-50 p-2" : ""}`}>
            <input
              type="radio"
              name="solveFor"
              value={id}
              checked={solveFor === id}
              onChange={(event) => setSolveFor(event.target.value as SolveTarget)}
              className="mr-2"
            />
            <span title={tooltip}>{label}</span>
            <input
              type="number"
              value={solveFor === id ? solved.value : value}
              onChange={(event) => setter(event.target.value)}
              disabled={solveFor === id}
              className={`mt-1 w-full rounded border p-2 ${fieldErrors[id] ? "border-red-500" : ""}`}
            />
            {fieldErrors[id] ? <p className="mt-1 text-xs text-red-700">{fieldErrors[id]}</p> : null}
          </label>
        ))}
      </div>

      <div className="rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
        <p className="text-lg font-semibold">
          Solved {solveFor}: {solved.value || "N/A"}
        </p>
        <button
          type="button"
          onClick={applySolvedValue}
          disabled={!solved.value}
          className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Apply Solved Value
        </button>
        {solved.error ? <p className="mt-2 text-sm text-red-700">{solved.error}</p> : null}
      </div>

      {cWasNegative ? (
        <div className="mt-4 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
          Using |c| to avoid double-negation.
        </div>
      ) : null}

      <div className="mt-8 h-80 rounded border bg-white p-4 shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={graphData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="deltaEps" label={{ value: "Delta eps", position: "insideBottom", offset: -5 }} />
            <YAxis scale="log" domain={["auto", "auto"]} label={{ value: "Nf (log)", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Line type="monotone" dataKey="Nf" stroke="#2563EB" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ContactCTA variant="tool" />

      <section className="mt-12 border-t pt-8 text-sm text-gray-600">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">How it works</h2>
        <p className="mb-4">
          The Coffin-Manson model predicts fatigue life under thermal cycling &mdash; solder joints, wire bonds,
          and other structures that crack from repeated expansion and contraction. Larger temperature swings
          (&Delta;T) mean <strong>fewer</strong> cycles to failure, so the acceleration factor between a harsh
          test and milder field use is:
        </p>
        <BlockMath math={"AF = \\left(\\frac{\\Delta T_{test}}{\\Delta T_{field}}\\right)^{c}"} />
        <p className="mb-4">
          where <strong>&Delta;T</strong> is the temperature range of each cycle and <strong>c</strong> is the
          Coffin-Manson exponent (roughly 2 for solder fatigue, higher for brittle materials).
        </p>
        <p className="mb-4">
          <strong>Example:</strong> Field cycling of &Delta;T&nbsp;=&nbsp;40&nbsp;&deg;C versus an accelerated
          test at &Delta;T&nbsp;=&nbsp;100&nbsp;&deg;C, with c&nbsp;=&nbsp;2, gives{" "}
          <strong>AF = (100/40)&sup2; = 6.25</strong>. One test cycle is worth about 6 field cycles, so a
          500-cycle test represents roughly 3,000 field cycles for that mechanism.
        </p>
        <p>
          Use this for thermal-cycling and thermal-shock fatigue. For diffusion- or reaction-driven wear-out, use
          the{" "}
          <Link href="/tools/Arrhenius" className="text-blue-600 hover:underline">
            Arrhenius calculator
          </Link>{" "}
          instead; to define the real-world &Delta;T distribution your product sees, start with the{" "}
          <Link href="/tools/MissionProfile" className="text-blue-600 hover:underline">
            Mission Profile tool
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
