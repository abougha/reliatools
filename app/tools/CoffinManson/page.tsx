"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { computeCoffinMansonCyclesToFailure } from "@/lib/reliabilityMath";
import { formatSig } from "@/lib/format";
import ContactCTA from "@/components/ContactCTA";
import RelatedLinks from "@/components/RelatedLinks";

type Mode = "af" | "life";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "af", label: "Test acceleration (ΔT)" },
  { id: "life", label: "Cycles to failure (strain)" },
];

const INPUT_CLASS = "mt-1 w-full rounded border p-2";

// ---------- Mode 1: acceleration factor from temperature swing ----------

const AF_DEFAULTS = { fieldDeltaT: "40", testDeltaT: "100", exponent: "2", testCycles: "500" };

function AccelerationFactorMode() {
  const [fieldDeltaT, setFieldDeltaT] = useState(AF_DEFAULTS.fieldDeltaT);
  const [testDeltaT, setTestDeltaT] = useState(AF_DEFAULTS.testDeltaT);
  const [exponent, setExponent] = useState(AF_DEFAULTS.exponent);
  const [testCycles, setTestCycles] = useState(AF_DEFAULTS.testCycles);

  const fieldVal = fieldDeltaT.trim() === "" ? NaN : Number(fieldDeltaT);
  const testVal = testDeltaT.trim() === "" ? NaN : Number(testDeltaT);
  const expVal = exponent.trim() === "" ? NaN : Number(exponent);
  const cyclesVal = testCycles.trim() === "" ? NaN : Number(testCycles);

  const errors = {
    field: Number.isFinite(fieldVal) && fieldVal > 0 ? "" : "Field ΔT must be > 0.",
    test: Number.isFinite(testVal) && testVal > 0 ? "" : "Test ΔT must be > 0.",
    exponent:
      !Number.isFinite(expVal) || expVal <= 0
        ? "Exponent must be > 0."
        : expVal > 20
          ? "Exponent looks too large; typical values are 1-9."
          : "",
    cycles: testCycles.trim() === "" || (Number.isFinite(cyclesVal) && cyclesVal > 0) ? "" : "Test cycles must be > 0.",
  };
  const ready = !errors.field && !errors.test && !errors.exponent;
  const af = ready ? Math.pow(testVal / fieldVal, expVal) : NaN;
  const hasCycles = ready && !errors.cycles && Number.isFinite(cyclesVal);

  const reset = () => {
    setFieldDeltaT(AF_DEFAULTS.fieldDeltaT);
    setTestDeltaT(AF_DEFAULTS.testDeltaT);
    setExponent(AF_DEFAULTS.exponent);
    setTestCycles(AF_DEFAULTS.testCycles);
  };

  const fields = [
    { label: "Field temperature swing, ΔT field (°C)", value: fieldDeltaT, set: setFieldDeltaT, error: errors.field },
    { label: "Test temperature swing, ΔT test (°C)", value: testDeltaT, set: setTestDeltaT, error: errors.test },
    {
      label: "Coffin-Manson exponent (c)",
      value: exponent,
      set: setExponent,
      error: errors.exponent,
      hint: "About 2 for solder joints; higher for brittle materials.",
    },
    {
      label: "Test cycles (optional)",
      value: testCycles,
      set: setTestCycles,
      error: errors.cycles,
      hint: "Converts your test length into equivalent field cycles.",
    },
  ];

  return (
    <div>
      <div className="mb-6 rounded border bg-gray-50 p-4">
        <BlockMath math={"AF = \\left(\\frac{\\Delta T_{test}}{\\Delta T_{field}}\\right)^{c}"} />
        <p className="mt-2 text-sm text-gray-700">
          <strong>&Delta;T</strong> is the temperature range of one cycle (hottest minus coldest).{" "}
          <strong>AF</strong> is how many field cycles one test cycle is worth.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.label} className="block text-sm">
            {field.label}
            <input
              type="number"
              value={field.value}
              onChange={(event) => field.set(event.target.value)}
              className={`${INPUT_CLASS} ${field.error ? "border-red-500" : ""}`}
            />
            {field.error ? <p className="mt-1 text-xs text-red-700">{field.error}</p> : null}
            {!field.error && field.hint ? <p className="mt-1 text-xs text-gray-500">{field.hint}</p> : null}
          </label>
        ))}
      </div>

      <div className="rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
        <p className="text-lg font-semibold">Acceleration factor (AF): {ready ? formatSig(af, 4) : "N/A"}</p>
        {ready ? (
          <p className="mt-1 text-sm">
            One test cycle at &Delta;T = {formatSig(testVal)}&deg;C does the fatigue damage of about {formatSig(af, 3)}{" "}
            field cycles at &Delta;T = {formatSig(fieldVal)}&deg;C.
            {hasCycles ? (
              <>
                {" "}
                A {formatSig(cyclesVal)}-cycle test represents roughly{" "}
                <strong>{Math.round(cyclesVal * af).toLocaleString()} field cycles</strong>.
              </>
            ) : null}
          </p>
        ) : (
          <p className="mt-1 text-sm">Fix the highlighted inputs above to see the result.</p>
        )}
      </div>

      {ready && af <= 1 ? (
        <div className="mt-4 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
          The test swing is not larger than the field swing, so this test is not accelerated.
        </div>
      ) : null}

      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        Reset
      </button>
    </div>
  );
}

// ---------- Mode 2: cycles to failure from strain range ----------

type SolveTarget = "Nf" | "A" | "deltaEps" | "c";

const LIFE_DEFAULTS: Record<SolveTarget, string> & { solveFor: SolveTarget } = {
  A: "100000",
  c: "2",
  deltaEps: "0.005",
  Nf: "4000000000",
  solveFor: "Nf",
};

const LIFE_FIELDS: Array<{ id: SolveTarget; label: string; hint?: string }> = [
  { id: "Nf", label: "Cycles to failure (Nf)" },
  { id: "A", label: "Material constant (A)" },
  { id: "deltaEps", label: "Strain range (Δε)", hint: "As a fraction, e.g. 0.005 = 0.5% strain." },
  { id: "c", label: "Exponent (c)", hint: "Enter as a positive number." },
];

function validateLifeField(id: SolveTarget, value: number): string | undefined {
  switch (id) {
    case "A":
      return Number.isFinite(value) && value > 0 ? undefined : "A must be > 0.";
    case "c":
      if (!Number.isFinite(value) || value === 0) return "c must be non-zero.";
      return Math.abs(value) > 20 ? "c looks too large; check units." : undefined;
    case "deltaEps":
      return Number.isFinite(value) && value > 0 && value < 1 ? undefined : "Strain range must be between 0 and 1.";
    case "Nf":
      return Number.isFinite(value) && value > 0 ? undefined : "Nf must be > 0.";
  }
}

function initialLifeInputs(): Record<SolveTarget, string> {
  return { A: LIFE_DEFAULTS.A, c: LIFE_DEFAULTS.c, deltaEps: LIFE_DEFAULTS.deltaEps, Nf: LIFE_DEFAULTS.Nf };
}

function CyclesToFailureMode() {
  const [raw, setRaw] = useState<Record<SolveTarget, string>>(initialLifeInputs);
  const [solveFor, setSolveFor] = useState<SolveTarget>(LIFE_DEFAULTS.solveFor);

  // The solved field is an output; only typed inputs are validated.
  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<SolveTarget, string>> = {};
    for (const { id } of LIFE_FIELDS) {
      if (id === solveFor) continue;
      const message = validateLifeField(id, raw[id].trim() === "" ? NaN : Number(raw[id]));
      if (message) errors[id] = message;
    }
    return errors;
  }, [raw, solveFor]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const solved = useMemo((): { value: number; error: string } => {
    if (hasErrors) return { value: NaN, error: "" };
    const A = Number(raw.A);
    const c = Math.abs(Number(raw.c));
    const eps = Number(raw.deltaEps);
    const nf = Number(raw.Nf);

    try {
      if (solveFor === "Nf") return { value: computeCoffinMansonCyclesToFailure(A, c, eps), error: "" };
      if (solveFor === "A") return { value: nf * Math.pow(eps, c), error: "" };
      if (solveFor === "deltaEps") {
        const value = Math.pow(A / nf, 1 / c);
        if (!(value > 0 && value < 1)) {
          return { value: NaN, error: "No strain range between 0 and 1 gives that life. Nf must be larger than A." };
        }
        return { value, error: "" };
      }
      const value = Math.log(A / nf) / Math.log(eps);
      if (!Number.isFinite(value) || value <= 0) {
        return { value: NaN, error: "No positive exponent fits these inputs. Nf must be larger than A." };
      }
      return { value, error: "" };
    } catch (error) {
      return { value: NaN, error: error instanceof Error ? error.message : "Calculation failed." };
    }
  }, [hasErrors, solveFor, raw]);

  const solvedText = formatSig(solved.value);
  const ready = !hasErrors && Number.isFinite(solved.value);
  const num = (id: SolveTarget) => (id === solveFor ? solved.value : Number(raw[id]));
  const AEff = num("A");
  const cEff = Math.abs(num("c"));

  const graphData = useMemo(() => {
    if (!ready) return [];
    const points: Array<{ deltaEps: number; Nf: number }> = [];
    for (let i = 1; i <= 20; i += 1) {
      const eps = i / 1000;
      const cycles = AEff * Math.pow(eps, -cEff);
      if (Number.isFinite(cycles) && cycles > 0) points.push({ deltaEps: eps, Nf: cycles });
    }
    return points;
  }, [ready, AEff, cEff]);

  const changeSolveFor = (next: SolveTarget) => {
    if (next === solveFor) return;
    // Carried at higher precision than displayed so the next answer does not drift.
    if (solvedText) setRaw((prev) => ({ ...prev, [solveFor]: formatSig(solved.value, 10) }));
    setSolveFor(next);
  };

  const reset = () => {
    setRaw(initialLifeInputs());
    setSolveFor(LIFE_DEFAULTS.solveFor);
  };

  const cWasNegative = solveFor !== "c" && Number(raw.c) < 0;
  const solvedLabel = LIFE_FIELDS.find((field) => field.id === solveFor)?.label ?? solveFor;

  return (
    <div>
      <div className="mb-6 rounded border bg-gray-50 p-4">
        <BlockMath math={"N_f = A\\,(\\Delta\\varepsilon)^{-c}"} />
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          <li>
            <strong>N<sub>f</sub></strong> = cycles to failure
          </li>
          <li>
            <strong>A</strong> = material constant (from fatigue test data)
          </li>
          <li>
            <strong>&Delta;&epsilon;</strong> = strain range per cycle
          </li>
          <li>
            <strong>c</strong> = Coffin-Manson exponent (positive)
          </li>
        </ul>
      </div>

      <p className="mb-3 text-sm text-gray-700">
        Select the value you want to find, then fill in the other three. The answer updates as you type.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LIFE_FIELDS.map(({ id, label, hint }) => {
          const isSolved = solveFor === id;
          return (
            <div key={id} className={`text-sm ${isSolved ? "rounded border-l-4 border-yellow-400 bg-yellow-50 p-2" : ""}`}>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="coffinMansonSolveFor"
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
                onChange={(event) => setRaw((prev) => ({ ...prev, [id]: event.target.value }))}
                disabled={isSolved}
                className={`${INPUT_CLASS} ${fieldErrors[id] ? "border-red-500" : ""}`}
              />
              {fieldErrors[id] ? <p className="mt-1 text-xs text-red-700">{fieldErrors[id]}</p> : null}
              {!fieldErrors[id] && hint && !isSolved ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
        <p className="text-lg font-semibold">
          {solvedLabel}: {ready ? solvedText : "N/A"}
        </p>
        {!ready ? (
          <p className="mt-1 text-sm">{solved.error || "Fix the highlighted inputs above to see the result."}</p>
        ) : null}
      </div>

      {cWasNegative ? (
        <div className="mt-4 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
          The exponent was entered as a negative number; its positive value is used, since the formula already applies the
          minus sign.
        </div>
      ) : null}

      <div className="mt-8 h-80 rounded border bg-white p-4 shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={graphData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="deltaEps"
              type="number"
              domain={["dataMin", "dataMax"]}
              label={{ value: "Strain range Δε", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              scale="log"
              domain={["auto", "auto"]}
              tickFormatter={(value: number) => formatSig(value, 2)}
              width={70}
              label={{ value: "Nf (log)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value: number) => [formatSig(value, 4), "Nf"]}
              labelFormatter={(value) => `Δε = ${value}`}
            />
            <Line type="monotone" dataKey="Nf" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        Reset
      </button>
    </div>
  );
}

// ---------- Page ----------

export default function CoffinMansonCalculator() {
  const [mode, setMode] = useState<Mode>("af");

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Coffin-Manson Thermal Fatigue Calculator</h1>
      <p className="mb-4 text-sm text-gray-600">
        Work out how much a thermal-cycling test accelerates field life, or estimate cycles to failure from a strain
        range.
      </p>

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 text-sm font-semibold" role="tablist">
        {MODES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={mode === entry.id}
            onClick={() => setMode(entry.id)}
            className={`rounded-md px-3.5 py-1.5 transition ${
              mode === entry.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {mode === "af" ? <AccelerationFactorMode /> : <CyclesToFailureMode />}

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
        <p className="mb-4">
          The second tab uses the strain form of the same model, N<sub>f</sub> = A&middot;(&Delta;&epsilon;)
          <sup>&minus;c</sup>, for when you have a strain range and a material constant from fatigue data rather
          than a pair of temperature swings.
        </p>
        <p>
          Use this for thermal-cycling and thermal-shock fatigue. For diffusion- or reaction-driven wear-out, use
          the{" "}
          <Link href="/tools/Arrhenius/" className="text-blue-600 hover:underline">
            Arrhenius calculator
          </Link>{" "}
          instead; to define the real-world &Delta;T distribution your product sees, start with the{" "}
          <Link href="/tools/MissionProfile/" className="text-blue-600 hover:underline">
            Mission Profile tool
          </Link>
          . To check whether your accelerated test hours support a failure-rate target, use the{" "}
          <Link href="/tools/FIT/" className="text-blue-600 hover:underline">
            FIT calculator
          </Link>
          .
        </p>
      </section>
      <RelatedLinks route="/tools/CoffinManson/" />
    </div>
  );
}
