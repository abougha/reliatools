"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import {
  Area,
  AreaChart,
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

function fmtFleetFailures(x: number): string {
  if (!isFinite(x)) return "—";
  const rounded = Math.round(x);
  const isWhole = Math.abs(x - rounded) < 1e-6;
  return `${isWhole ? "" : "≈ "}${fmt(rounded)}`;
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

function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ---------- Module 1: FIT / Reliability Converter ----------

const CONVERTER_DEFAULTS = {
  known: "fit" as KnownField,
  value: "1",
  missionHours: "10000",
  fleetSize: "100000",
};

const CONVERTER_FIELDS: { key: KnownField; pill: string; label: string; unit: string }[] = [
  { key: "fit", pill: "FIT rate", label: "FIT rate", unit: "failures / 1e9 h" },
  { key: "lambda", pill: "λ", label: "Failure rate λ", unit: "per hour" },
  { key: "reliability", pill: "Reliability %", label: "Reliability over mission", unit: "%" },
  { key: "ppm", pill: "ppm", label: "Failure probability over mission", unit: "ppm" },
  { key: "mttf", pill: "MTTF", label: "MTTF or MTBF", unit: "hours" },
];

// Metrics shown in the read-only "Converted values" grid. Reliability is excluded
// here because it is the hero number in the dark panel above. The active driver
// metric (whichever the user is entering) is filtered out at render time.
const CONVERTED_TILES: {
  key: KnownField;
  label: string;
  unit?: string;
  get: (r: ConverterResult) => string;
}[] = [
  { key: "fit", label: "FIT rate", get: (r) => fmt(r.fit) },
  { key: "lambda", label: "Failure rate λ", unit: "/h", get: (r) => fmt(r.lambda) },
  { key: "ppm", label: "Failure probability", unit: "ppm", get: (r) => fmt(r.ppm) },
  { key: "mttf", label: "MTTF or MTBF", unit: "h", get: (r) => fmt(r.mttf) },
];

// Raw (non-locale-formatted) numeric value for a field, used to seed the editable
// input when the user switches which metric is the driver.
function rawSeed(key: KnownField, res: ConverterResult): number {
  switch (key) {
    case "fit":
      return res.fit;
    case "lambda":
      return res.lambda;
    case "reliability":
      return res.reliability * 100;
    case "ppm":
      return res.ppm;
    case "mttf":
      return res.mttf;
  }
}

function seedString(n: number): string {
  if (!isFinite(n)) return "";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e6 || abs < 1e-3) return n.toExponential(4);
  return String(Number(n.toPrecision(6)));
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-[10px] border border-[#efeee9] px-3 py-2.5">
      <div className="mb-1 text-[10.5px] text-[#9a9ea4]">{label}</div>
      <div className="font-mono text-[15px] font-semibold text-[#1b1c1e]">
        {value}
        {unit ? <span className="ml-1 text-[11px] font-normal text-[#9a9ea4]">{unit}</span> : null}
      </div>
    </div>
  );
}

function ConverterModule() {
  const [known, setKnown] = useState<KnownField>(CONVERTER_DEFAULTS.known);
  const [value, setValue] = useState(CONVERTER_DEFAULTS.value);
  const [missionHours, setMissionHours] = useState(CONVERTER_DEFAULTS.missionHours);
  const [fleetSize, setFleetSize] = useState(CONVERTER_DEFAULTS.fleetSize);

  const t = Number(missionHours);
  const n = Number(fleetSize);

  const parsedValue = useMemo(() => {
    const v = Number(value);
    return known === "reliability" ? v / 100 : v;
  }, [value, known]);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"t" | "n" | "value", string>> = {};
    if (!Number.isFinite(t) || t <= 0) errors.t = "Mission hours must be > 0.";
    if (!Number.isFinite(n) || n < 1) errors.n = "Sample size or Fleet size must be ≥ 1.";
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      errors.value = "Enter a valid non-negative value.";
    } else if (known === "reliability" && (parsedValue <= 0 || parsedValue > 1)) {
      errors.value = "Reliability must be in (0, 100%].";
    } else if (known === "ppm" && parsedValue >= 1e6) {
      errors.value = "ppm must be < 1,000,000.";
    }
    return errors;
  }, [t, n, parsedValue, known]);

  // Live recompute, debounced ~150ms so fast typing doesn't thrash the chart.
  const debouncedValue = useDebouncedValue(value);
  const debouncedMissionHours = useDebouncedValue(missionHours);
  const debouncedFleetSize = useDebouncedValue(fleetSize);

  const computed = useMemo(() => {
    const subT = Number(debouncedMissionHours);
    const subN = Number(debouncedFleetSize);
    const raw = Number(debouncedValue);
    const subValue = known === "reliability" ? raw / 100 : raw;
    return { subT, subN, subValue };
  }, [debouncedValue, debouncedMissionHours, debouncedFleetSize, known]);

  const res: ConverterResult | null = useMemo(() => {
    const { subT, subN, subValue } = computed;
    if (!Number.isFinite(subT) || subT <= 0 || !Number.isFinite(subN) || subN < 1 || !Number.isFinite(subValue) || subValue < 0) {
      return null;
    }
    return convert({ known, value: subValue, missionHours: subT, fleetSize: subN });
  }, [computed, known]);

  const handleDriverChange = (key: KnownField) => {
    if (key === known) return;
    if (res) setValue(seedString(rawSeed(key, res)));
    setKnown(key);
  };

  const resetInputs = () => {
    setKnown(CONVERTER_DEFAULTS.known);
    setValue(CONVERTER_DEFAULTS.value);
    setMissionHours(CONVERTER_DEFAULTS.missionHours);
    setFleetSize(CONVERTER_DEFAULTS.fleetSize);
  };

  const chartData = useMemo(() => {
    if (!res || !isFinite(res.lambda)) return [];
    const pts: { t: number; R: number }[] = [];
    const tMax = computed.subT * 1.5;
    for (let i = 0; i <= 60; i++) {
      const tt = (tMax * i) / 60;
      pts.push({ t: tt, R: Math.exp(-res.lambda * tt) });
    }
    return pts;
  }, [res, computed]);

  const activeField = CONVERTER_FIELDS.find((f) => f.key === known)!;

  const handleDownload = () => {
    if (!res) return;
    downloadCsv("fit-reliability.csv", [
      ["Mission hours", String(computed.subT)],
      ["Sample size or Fleet size", String(computed.subN)],
      ["FIT", fmt(res.fit)],
      ["Lambda (per h)", fmt(res.lambda)],
      ["MTTF or MTBF (h)", fmt(res.mttf)],
      ["Reliability", res.reliability.toPrecision(8)],
      ["Failure prob ppm", fmt(res.ppm)],
      ["Expected fleet failures", fmt(res.expectedFleetFailures)],
      ["Reliability nines", isFinite(res.nines) ? res.nines.toFixed(2) : "inf"],
    ]);
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[320px_1fr] md:items-stretch">
        {/* LEFT: driver input + mission context */}
        <div>
          <div className="mb-4 rounded-[10px] border border-[#e6e4df] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wide text-[#71757c]">
                I know my…
              </span>
              <button
                type="button"
                onClick={resetInputs}
                className="text-[11px] text-[#9a9ea4] hover:text-[#6a6e74]"
              >
                Reset
              </button>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {CONVERTER_FIELDS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => handleDriverChange(f.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    known === f.key
                      ? "bg-[#0e9c8b] text-white"
                      : "bg-[#f3f2ef] text-[#6a6e74] hover:bg-[#e9e7e2]"
                  }`}
                >
                  {f.pill}
                </button>
              ))}
            </div>
            <div className="rounded-[9px] border-2 border-[#0e9c8b] bg-[#f2fbf9] px-3.5 py-2.5">
              <label className="mb-0.5 block text-[10.5px] font-semibold text-[#0e9c8b]">
                {activeField.label} ({activeField.unit})
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-transparent font-mono text-xl font-semibold text-[#0b6a60] outline-none"
              />
            </div>
            {fieldErrors.value ? <p className="mt-2 text-xs text-red-700">{fieldErrors.value}</p> : null}
          </div>

          <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-[#71757c]">
            Mission context
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[10.5px] text-[#9a9ea4]">Mission hours (t)</span>
              <input
                type="number"
                value={missionHours}
                onChange={(e) => setMissionHours(e.target.value)}
                className={`w-full rounded-[8px] border px-2.5 py-2 font-mono text-[13px] ${
                  fieldErrors.t ? "border-red-500" : "border-[#dcdad5]"
                }`}
              />
              {fieldErrors.t ? <p className="mt-1 text-[11px] text-red-700">{fieldErrors.t}</p> : null}
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] text-[#9a9ea4]">Fleet size (n)</span>
              <input
                type="number"
                value={fleetSize}
                onChange={(e) => setFleetSize(e.target.value)}
                className={`w-full rounded-[8px] border px-2.5 py-2 font-mono text-[13px] ${
                  fieldErrors.n ? "border-red-500" : "border-[#dcdad5]"
                }`}
              />
              {fieldErrors.n ? <p className="mt-1 text-[11px] text-red-700">{fieldErrors.n}</p> : null}
            </label>
          </div>
        </div>

        {/* RIGHT: dark result panel */}
        <div className="flex flex-col rounded-xl bg-[#1b1c1e] px-5 pb-4 pt-5 text-white">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <div>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[#7f8489]">
                Reliability over {Number.isFinite(computed.subT) ? fmt(computed.subT) : "—"} h
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-4xl font-semibold tracking-tight">
                  {res ? (res.reliability * 100).toFixed(4) : "—"}
                </span>
                <span className="text-lg text-[#8fd7cd]">%</span>
              </div>
            </div>
            <span className="whitespace-nowrap text-[12.5px] font-semibold text-[#56c9ba]">
              {res && isFinite(res.nines) ? `${res.nines.toFixed(1)} nines` : ""}
            </span>
          </div>

          <div className="mt-2 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#2c2e31" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "#7f8489", fontSize: 10 }}
                  tickFormatter={(v) => fmt(v)}
                  stroke="#3a3d40"
                  label={{ value: "Time (h) →", position: "insideBottom", offset: -4, fill: "#7f8489", fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: "#7f8489", fontSize: 10 }}
                  tickFormatter={(v) => v.toFixed(1)}
                  stroke="#3a3d40"
                  width={28}
                />
                <RechartTooltip
                  contentStyle={{ background: "#232527", border: "1px solid #2c2e31", fontSize: 12 }}
                  labelStyle={{ color: "#7f8489" }}
                  formatter={(v: number) => v.toFixed(6)}
                  labelFormatter={(l) => `t = ${fmt(Number(l))} h`}
                />
                <Area type="monotone" dataKey="R" stroke="#56c9ba" strokeWidth={2.5} fill="#56c9ba" fillOpacity={0.12} />
                {res ? <ReferenceLine x={computed.subT} stroke="#7f8489" strokeDasharray="3 3" /> : null}
                {res ? <ReferenceDot x={computed.subT} y={res.reliability} r={4} fill="#56c9ba" stroke="none" /> : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex items-center justify-between font-mono text-[10.5px] text-[#7f8489]">
            <span>R(t) mission profile</span>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!res}
              className="font-semibold text-[#56c9ba] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download CSV ↗
            </button>
          </div>
        </div>
      </div>

      {/* Converted values */}
      <div className="mt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wide text-[#71757c]">
            Converted values
          </span>
          <span className="text-[10px] text-[#b7bbc0]">read-only</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CONVERTED_TILES.filter((m) => m.key !== known).map((m) => (
            <Tile key={m.key} label={m.label} value={res ? m.get(res) : "—"} unit={m.unit} />
          ))}
          <Tile label="Expected fleet failures" value={res ? fmtFleetFailures(res.expectedFleetFailures) : "—"} />
        </div>
        {res ? (
          <p className="mt-3 text-[12.5px] text-[#6a6e74]">
            At {fmt(res.fit)} FIT over {fmt(computed.subT)} h, a fleet of {fmt(computed.subN)} should see about{" "}
            <strong>{fmt(res.expectedFleetFailures)}</strong> failure(s)
            {isFinite(res.nines) ? ` — ${res.nines.toFixed(1)} nines of reliability` : ""}. High reliability is not
            zero risk.
          </p>
        ) : null}
      </div>

      {/* Formula & assumptions, collapsed by default */}
      <details className="mt-5 text-[11.5px] text-[#9a9ea4]">
        <summary className="cursor-pointer select-none font-medium hover:text-[#6a6e74]">
          Formula &amp; assumptions
        </summary>
        <div className="mt-3 rounded border bg-gray-50 p-4 text-sm text-gray-700">
          <BlockMath math={"R(t)=e^{-\\lambda t},\\quad \\text{FIT}=\\lambda\\times 10^{9},\\quad \\text{MTTF}=\\tfrac{1}{\\lambda}"} />
          <ul className="mt-2 space-y-1">
            <li>
              <strong>&lambda;</strong> = constant failure rate (per hour)
            </li>
            <li>
              <strong>t</strong> = mission hours, <strong>n</strong> = sample size or fleet size
            </li>
            <li>
              <strong>FIT</strong> = failures per 1e9 device-hours
            </li>
          </ul>
        </div>
      </details>
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

const STEPS = [
  { id: "converter", label: "1 · Convert" },
  { id: "evidence", label: "2 · Check test evidence →" },
] as const;

export default function FitCalculatorPage() {
  const [tab, setTab] = useState<(typeof STEPS)[number]["id"]>("converter");

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold">FIT Calculator</h1>
      <p className="mt-2 text-gray-600">
        A FIT number only means something when tied to mission life, fleet size, confidence, acceleration, and test
        evidence. Convert between reliability metrics, then check whether a test plan actually supports the claim.
      </p>

      <div className="mt-6 inline-flex rounded-lg bg-[#f3f2ef] p-1 text-[13px] font-semibold">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setTab(s.id)}
            className={`rounded-md px-3.5 py-1.5 transition ${
              tab === s.id ? "bg-white text-[#1b1c1e] shadow-sm" : "text-[#9a9ea4] hover:text-[#6a6e74]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-[#e6e4df] bg-white p-6 shadow-sm">
        {tab === "converter" ? <ConverterModule /> : <EvidenceModule />}
      </div>

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
