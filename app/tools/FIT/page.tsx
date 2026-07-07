"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BlockMath, InlineMath } from "react-katex";
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
import {
  convert,
  evidenceCheck,
  chiSqUpperMean,
  type KnownField,
  type ConverterResult,
  type EvidenceResult,
} from "@/lib/fitpmhf";
import ContactCTA from "@/components/ContactCTA";

function fmt(n: number, sig = 4): string {
  if (!isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e6 || abs < 1e-3) return n.toExponential(sig - 1);
  return Number(n.toPrecision(sig)).toLocaleString();
}

function downloadCsv(filename: string, rows: [string, string][]) {
  const csv = rows.map(([k, v]) => `"${k}","${v}"`).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ---------- Module 1: FIT / Reliability Converter ----------

const CONVERTER_DEFAULTS = {
  known: "fit" as KnownField,
  value: "1",
  missionHours: "10000",
  fleetSize: "100000",
};

const CONVERTER_FIELDS: { key: KnownField; label: string; unit: string }[] = [
  { key: "fit", label: "FIT rate", unit: "failures / 1e9 h" },
  { key: "lambda", label: "Failure rate λ", unit: "per hour" },
  { key: "reliability", label: "Reliability over mission", unit: "%" },
  { key: "ppm", label: "Failure probability over mission", unit: "ppm" },
  { key: "mttf", label: "MTTF", unit: "hours" },
];

function ConverterModule() {
  const [known, setKnown] = useState<KnownField>(CONVERTER_DEFAULTS.known);
  const [value, setValue] = useState(CONVERTER_DEFAULTS.value);
  const [missionHours, setMissionHours] = useState(CONVERTER_DEFAULTS.missionHours);
  const [fleetSize, setFleetSize] = useState(CONVERTER_DEFAULTS.fleetSize);

  const t = Number(missionHours);
  const N = Number(fleetSize);

  const parsedValue = useMemo(() => {
    const v = Number(value);
    return known === "reliability" ? v / 100 : v;
  }, [value, known]);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"t" | "N" | "value", string>> = {};
    if (!Number.isFinite(t) || t <= 0) errors.t = "Mission hours must be > 0.";
    if (!Number.isFinite(N) || N < 1) errors.N = "Fleet size must be ≥ 1.";
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      errors.value = "Enter a valid non-negative value.";
    } else if (known === "reliability" && (parsedValue <= 0 || parsedValue > 1)) {
      errors.value = "Reliability must be in (0, 100%].";
    } else if (known === "ppm" && parsedValue >= 1e6) {
      errors.value = "ppm must be < 1,000,000.";
    }
    return errors;
  }, [t, N, parsedValue, known]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const res: ConverterResult | null = !hasErrors
    ? convert({ known, value: parsedValue, missionHours: t, fleetSize: N })
    : null;

  const resetInputs = () => {
    setKnown(CONVERTER_DEFAULTS.known);
    setValue(CONVERTER_DEFAULTS.value);
    setMissionHours(CONVERTER_DEFAULTS.missionHours);
    setFleetSize(CONVERTER_DEFAULTS.fleetSize);
  };

  const chartData = useMemo(() => {
    if (!res || !isFinite(res.lambda)) return [];
    const pts: { t: number; R: number }[] = [];
    const tMax = t * 1.5;
    for (let i = 0; i <= 60; i++) {
      const tt = (tMax * i) / 60;
      pts.push({ t: tt, R: Math.exp(-res.lambda * tt) });
    }
    return pts;
  }, [res, t]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">FIT / Reliability Converter</h2>
        <button
          type="button"
          onClick={resetInputs}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Reset
        </button>
      </div>

      <div className="mb-6 rounded border bg-gray-50 p-4">
        <BlockMath math={"R(t)=e^{-\\lambda t},\\quad \\text{FIT}=\\lambda\\times 10^{9},\\quad \\text{MTTF}=\\tfrac{1}{\\lambda}"} />
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          <li>
            <strong>&lambda;</strong> = constant failure rate (per hour)
          </li>
          <li>
            <strong>t</strong> = mission hours, <strong>N</strong> = fleet size
          </li>
          <li>
            <strong>FIT</strong> = failures per 1e9 device-hours
          </li>
        </ul>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800">Enter one known value</p>
          {CONVERTER_FIELDS.map((f) => (
            <label
              key={f.key}
              className={`block text-sm ${known === f.key ? "rounded border-l-4 border-yellow-400 bg-yellow-50 p-2" : ""}`}
            >
              <input
                type="radio"
                name="known"
                checked={known === f.key}
                onChange={() => setKnown(f.key)}
                className="mr-2"
              />
              {f.label} <span className="text-gray-400">({f.unit})</span>
              <input
                type="number"
                disabled={known !== f.key}
                value={known === f.key ? value : ""}
                onChange={(e) => setValue(e.target.value)}
                className={`mt-1 w-full rounded border p-2 disabled:bg-gray-100 ${
                  known === f.key && fieldErrors.value ? "border-red-500" : ""
                }`}
              />
            </label>
          ))}
          {fieldErrors.value ? <p className="text-xs text-red-700">{fieldErrors.value}</p> : null}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-800">Mission context</p>
          <label className="block text-sm text-gray-700">
            Mission hours (t)
            <input
              type="number"
              value={missionHours}
              onChange={(e) => setMissionHours(e.target.value)}
              className={`mt-1 w-full rounded border p-2 ${fieldErrors.t ? "border-red-500" : ""}`}
            />
            {fieldErrors.t ? <p className="mt-1 text-xs text-red-700">{fieldErrors.t}</p> : null}
          </label>
          <label className="block text-sm text-gray-700">
            Fleet size (N)
            <input
              type="number"
              value={fleetSize}
              onChange={(e) => setFleetSize(e.target.value)}
              className={`mt-1 w-full rounded border p-2 ${fieldErrors.N ? "border-red-500" : ""}`}
            />
            {fieldErrors.N ? <p className="mt-1 text-xs text-red-700">{fieldErrors.N}</p> : null}
          </label>
        </div>
      </div>

      {res && (
        <>
          <div className="rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
            <p className="text-lg font-semibold">
              Reliability over mission: {(res.reliability * 100).toPrecision(6)}%
              {isFinite(res.nines) ? ` (${res.nines.toFixed(1)} nines)` : ""}
            </p>
            <p className="mt-1 text-sm">Failure probability: {fmt(res.ppm)} ppm</p>
            <p className="mt-1 text-sm">Expected fleet failures: {fmt(res.expectedFleetFailures)}</p>
            <p className="mt-1 text-sm">
              Failure rate &lambda;: {fmt(res.lambda)} /h &mdash; FIT: {fmt(res.fit)} &mdash; MTTF: {fmt(res.mttf)} h
            </p>
          </div>

          <div className="mt-4 rounded border-l-4 border-gray-400 bg-gray-50 p-3 text-sm text-gray-700">
            At {fmt(res.fit)} FIT over {fmt(t)} h, a fleet of {fmt(N)} should see about{" "}
            <strong>{fmt(res.expectedFleetFailures)}</strong> failure(s)
            {isFinite(res.nines) ? ` — ${res.nines.toFixed(1)} nines of reliability` : ""}. High reliability is not
            zero risk.
          </div>

          {chartData.length > 0 && (
            <div className="mt-6 h-80 rounded border bg-white p-4 shadow">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tickFormatter={(v) => fmt(v)} label={{ value: "Time (h)", position: "insideBottom", offset: -5 }} />
                  <YAxis
                    domain={[0, 1]}
                    tickFormatter={(v) => v.toFixed(3)}
                    label={{ value: "Reliability R(t)", angle: -90, position: "insideLeft" }}
                  />
                  <RechartTooltip formatter={(v: number) => v.toFixed(6)} labelFormatter={(l) => `t = ${fmt(Number(l))} h`} />
                  <Line type="monotone" dataKey="R" stroke="#2563EB" strokeWidth={2} dot={false} />
                  <ReferenceLine x={t} stroke="black" strokeDasharray="3 3" />
                  <ReferenceDot x={t} y={res.reliability} r={5} fill="black" stroke="none" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <button
            onClick={() =>
              downloadCsv("fit-reliability.csv", [
                ["Mission hours", String(t)],
                ["Fleet size", String(N)],
                ["FIT", fmt(res.fit)],
                ["Lambda (per h)", fmt(res.lambda)],
                ["MTTF (h)", fmt(res.mttf)],
                ["Reliability", res.reliability.toPrecision(8)],
                ["Failure prob ppm", fmt(res.ppm)],
                ["Expected fleet failures", fmt(res.expectedFleetFailures)],
                ["Reliability nines", isFinite(res.nines) ? res.nines.toFixed(2) : "inf"],
              ])
            }
            className="mt-4 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Download CSV
          </button>
        </>
      )}
    </div>
  );
}

// ---------- Module 2: Test Evidence Reality Check ----------

const EVIDENCE_DEFAULTS = {
  targetFit: "1",
  confidence: "90",
  units: "100",
  hoursPerUnit: "1000",
  af: "20",
  failures: "0",
};

function EvidenceModule() {
  const [targetFit, setTargetFit] = useState(EVIDENCE_DEFAULTS.targetFit);
  const [confidence, setConfidence] = useState(EVIDENCE_DEFAULTS.confidence);
  const [units, setUnits] = useState(EVIDENCE_DEFAULTS.units);
  const [hoursPerUnit, setHoursPerUnit] = useState(EVIDENCE_DEFAULTS.hoursPerUnit);
  const [af, setAf] = useState(EVIDENCE_DEFAULTS.af);
  const [failures, setFailures] = useState(EVIDENCE_DEFAULTS.failures);

  const target = Number(targetFit);
  const C = Number(confidence) / 100;
  const nUnits = Number(units);
  const h = Number(hoursPerUnit);
  const AF = Number(af);
  const r = Math.max(0, Math.floor(Number(failures)));

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"target" | "C" | "n" | "h" | "AF" | "r", string>> = {};
    if (!Number.isFinite(target) || target <= 0) errors.target = "Target FIT must be > 0.";
    if (!Number.isFinite(C) || C <= 0 || C >= 1) errors.C = "Confidence must be between 0 and 100 (exclusive).";
    if (!Number.isFinite(nUnits) || nUnits < 1) errors.n = "Test units must be ≥ 1.";
    if (!Number.isFinite(h) || h <= 0) errors.h = "Test hours per unit must be > 0.";
    if (!Number.isFinite(AF) || AF < 1) errors.AF = "Acceleration factor must be ≥ 1.";
    if (!Number.isFinite(r) || r < 0) errors.r = "Failures must be ≥ 0.";
    return errors;
  }, [target, C, nUnits, h, AF, r]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const res: EvidenceResult | null = !hasErrors
    ? evidenceCheck({ targetFit: target, confidence: C, units: nUnits, hoursPerUnit: h, accelerationFactor: AF, failures: r })
    : null;

  const resetInputs = () => {
    setTargetFit(EVIDENCE_DEFAULTS.targetFit);
    setConfidence(EVIDENCE_DEFAULTS.confidence);
    setUnits(EVIDENCE_DEFAULTS.units);
    setHoursPerUnit(EVIDENCE_DEFAULTS.hoursPerUnit);
    setAf(EVIDENCE_DEFAULTS.af);
    setFailures(EVIDENCE_DEFAULTS.failures);
  };

  const chartData = useMemo(() => {
    if (!res) return [];
    const m = chiSqUpperMean(C, r);
    const start = Math.log10(Math.max(res.equivHours / 100, 1));
    const end = Math.log10(res.requiredEquivHours * 10);
    const pts: { T: number; fit: number }[] = [];
    for (let i = 0; i <= 60; i++) {
      const T = Math.pow(10, start + ((end - start) * i) / 60);
      pts.push({ T, fit: (m / T) * 1e9 });
    }
    return pts;
  }, [res, C, r]);

  const fields: { label: string; value: string; onChange: (v: string) => void; error?: string }[] = [
    { label: "Target FIT", value: targetFit, onChange: setTargetFit, error: fieldErrors.target },
    { label: "Confidence (%)", value: confidence, onChange: setConfidence, error: fieldErrors.C },
    { label: "Test units (n)", value: units, onChange: setUnits, error: fieldErrors.n },
    { label: "Test hours per unit (h)", value: hoursPerUnit, onChange: setHoursPerUnit, error: fieldErrors.h },
    { label: "Acceleration factor (AF)", value: af, onChange: setAf, error: fieldErrors.AF },
    { label: "Number of failures (r)", value: failures, onChange: setFailures, error: fieldErrors.r },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Test Evidence Reality Check</h2>
        <button
          type="button"
          onClick={resetInputs}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Reset
        </button>
      </div>

      <div className="mb-6 rounded border bg-gray-50 p-4">
        <p className="mb-2 text-sm text-gray-600">Time-terminated test, upper confidence bound on failure rate:</p>
        <BlockMath math={"\\lambda_{\\text{upper}}=\\dfrac{\\chi^{2}_{C,\\,2r+2}}{2\\,T_{\\text{equiv}}},\\qquad T_{\\text{equiv}}=n\\cdot h\\cdot \\text{AF}"} />
        <p className="text-xs text-gray-500">
          Zero-failure case reduces to <InlineMath math={"T_{\\text{req}}=-\\ln(1-C)/\\lambda_{\\text{target}}"} />.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <label key={f.label} className="block text-sm text-gray-700">
            {f.label}
            <input
              type="number"
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className={`mt-1 w-full rounded border p-2 ${f.error ? "border-red-500" : ""}`}
            />
            {f.error ? <p className="mt-1 text-xs text-red-700">{f.error}</p> : null}
          </label>
        ))}
      </div>

      {res && (
        <>
          <div
            className={`rounded border-l-4 p-4 text-sm ${
              res.pass ? "border-green-500 bg-green-50 text-green-800" : "border-amber-500 bg-amber-50 text-amber-800"
            }`}
          >
            <p className="text-lg font-semibold">
              {res.pass ? "PASS" : "SHORTFALL"} &mdash; demonstrated upper FIT: {fmt(res.demonstratedFit)}
            </p>
            {res.pass ? (
              <p className="mt-1">
                This plan demonstrates {fmt(res.demonstratedFit)} FIT at {confidence}% confidence, meeting the{" "}
                {fmt(target)} FIT target.
              </p>
            ) : (
              <p className="mt-1">
                This plan only supports {fmt(res.demonstratedFit)} FIT, about {fmt(res.shortfallFactor)}&times; the{" "}
                {fmt(target)} FIT target. You need ~{fmt(res.requiredEquivHours)} equivalent device-hours (&asymp;{" "}
                {fmt(res.requiredUnits)} units at {fmt(h)} h each and AF {fmt(AF)}, or {fmt(res.requiredHoursPerUnit)}{" "}
                h/unit at {fmt(nUnits)} units).
              </p>
            )}
            <p className="mt-2 text-xs opacity-80">
              Equivalent device-hours: {fmt(res.equivHours)} h &mdash; required: {fmt(res.requiredEquivHours)} h
            </p>
          </div>

          {chartData.length > 0 && (
            <div className="mt-6 h-80 rounded border bg-white p-4 shadow">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="T"
                    scale="log"
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => fmt(v)}
                    label={{ value: "Equivalent device-hours", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    scale="log"
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => fmt(v)}
                    width={70}
                    label={{ value: "Demonstrable FIT", angle: -90, position: "insideLeft", offset: -5 }}
                  />
                  <RechartTooltip formatter={(v: number) => `${fmt(v)} FIT`} labelFormatter={(l) => `${fmt(Number(l))} h`} />
                  <Line type="monotone" dataKey="fit" stroke="#2563EB" strokeWidth={2} dot={false} />
                  <ReferenceLine
                    y={target}
                    stroke="#dc2626"
                    strokeDasharray="5 5"
                    label={{ value: `Target ${fmt(target)} FIT`, position: "insideTopRight", fill: "#dc2626", fontSize: 12 }}
                  />
                  <ReferenceLine x={res.equivHours} stroke="black" strokeDasharray="3 3" />
                  <ReferenceDot x={res.equivHours} y={res.demonstratedFit} r={5} fill="black" stroke="none" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <button
            onClick={() =>
              downloadCsv("fit-evidence.csv", [
                ["Target FIT", String(target)],
                ["Confidence", String(C)],
                ["Units", String(nUnits)],
                ["Hours per unit", String(h)],
                ["Acceleration factor", String(AF)],
                ["Failures", String(r)],
                ["Equivalent device-hours", fmt(res.equivHours)],
                ["Demonstrated upper FIT", fmt(res.demonstratedFit)],
                ["Required equivalent hours", fmt(res.requiredEquivHours)],
                ["Required units", String(res.requiredUnits)],
                ["Required hours per unit", fmt(res.requiredHoursPerUnit)],
                ["Pass", String(res.pass)],
              ])
            }
            className="mt-4 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Download CSV
          </button>
        </>
      )}
    </div>
  );
}

// ---------- Page ----------

const TABS = [
  { id: "converter", label: "FIT / Reliability Converter" },
  { id: "evidence", label: "Test Evidence Reality Check" },
] as const;

export default function FitCalculatorPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("converter");

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold">FIT Calculator</h1>
      <p className="mt-2 text-gray-600">
        A FIT number only means something when tied to mission life, fleet size, confidence, acceleration, and test
        evidence. Convert between reliability metrics, then check whether a test plan actually supports the claim.
      </p>

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        {TABS.map((tt) => (
          <button
            key={tt.id}
            type="button"
            onClick={() => setTab(tt.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === tt.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tt.label}
          </button>
        ))}
      </div>

      <div className="mt-6">{tab === "converter" ? <ConverterModule /> : <EvidenceModule />}</div>

      <ContactCTA variant="tool" />

      <section className="mt-12 border-t pt-8 text-sm text-gray-600">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">Assumptions &amp; limitations</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            The converter assumes a constant failure rate (exponential model). It does not represent infant-mortality
            or wear-out phases &mdash; that is what the{" "}
            <Link href="/tools/Weibull" className="text-blue-600 hover:underline">
              Weibull
            </Link>{" "}
            module covers.
          </li>
          <li>
            The evidence check uses the chi-square upper confidence bound for time-terminated testing with r observed
            failures, applied to equivalent device-hours (real hours &times; acceleration factor).
          </li>
          <li>
            Acceleration factor is treated as a single scalar; it should come from a validated physics-of-failure
            model (e.g.{" "}
            <Link href="/tools/Arrhenius" className="text-blue-600 hover:underline">
              Arrhenius
            </Link>
            ,{" "}
            <Link href="/tools/CoffinManson" className="text-blue-600 hover:underline">
              Coffin-Manson
            </Link>
            ).
          </li>
          <li>This tool is educational and for planning. It does not replace a formal FMEDA, safety case, or ISO 26262 assessment.</li>
        </ul>
      </section>
    </div>
  );
}
