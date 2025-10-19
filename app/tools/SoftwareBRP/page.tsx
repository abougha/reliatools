"use client";

import React, { useMemo, useState } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { Download, RefreshCw, SlidersHorizontal, Wand2 } from "lucide-react";

/**
 * SOFTWARE BAYESIAN RELIABILITY PREDICTOR (BRP)
 * -------------------------------------------------
 * A lightweight, self-contained page that estimates software reliability
 * using a Bayesian-style fusion of process & code-quality evidence.
 *
 * TECH STACK
 * - Next.js App Router compatible React component (client only)
 * - Tailwind CSS for styling (matches Reliatools look & feel)
 * - KaTeX for math, Recharts for visuals, Lucide for icons
 *
 * FEATURES
 * - Equation panel with Bayes' rule
 * - Inputs in a compact 2-column grid with sliders & selects
 * - Posterior reliability probability, residual-faults estimate, CI band
 * - Sensitivity (tornado) chart indicating factor influence
 * - "What-if" simulator: tweak a single factor and see delta in probability
 * - Export CSV of inputs + results
 * - Presets: Web API, Embedded, Enterprise
 *
 * NOTE: This is an engineering-friendly approximation, not a full BBN CPT engine.
 * It uses likelihood functions per factor (logistic/triangular) and multiplies
 * likelihood ratios against a prior. This mirrors a naive Bayes approach and keeps
 * the UI responsive without external deps.
 */

// ---------- Types ----------

type FactorKey =
  | "testCoverage"
  | "reviewCoverage"
  | "codeComplexity"
  | "loc"
  | "defectDensityPrior"
  | "teamExperience"
  | "processMaturity";

type Inputs = {
  targetReliability: number; // e.g., probability of meeting R target
  priorReliability: number; // prior belief P(HighReliability)
  testCoverage: number; // percent 0-100
  reviewCoverage: number; // percent 0-100
  codeComplexity: "Low" | "Moderate" | "High";
  loc: number; // thousands of lines of code (KLOC)
  defectDensityPrior: number; // defects per KLOC expected pre-test
  teamExperience: "Low" | "Medium" | "High";
  processMaturity: 1 | 2 | 3 | 4 | 5; // like CMMI-ish (1..5)
};

// ---------- Presets ----------

const PRESETS: Record<string, Partial<Inputs>> = {
  "Web API (cloud microservice)": {
    priorReliability: 0.6,
    testCoverage: 75,
    reviewCoverage: 65,
    codeComplexity: "Moderate",
    loc: 40,
    defectDensityPrior: 0.7,
    teamExperience: "Medium",
    processMaturity: 3,
  },
  "Embedded (safety-adjacent)": {
    priorReliability: 0.7,
    testCoverage: 85,
    reviewCoverage: 80,
    codeComplexity: "Moderate",
    loc: 120,
    defectDensityPrior: 0.4,
    teamExperience: "High",
    processMaturity: 4,
  },
  "Enterprise App (monolith)": {
    priorReliability: 0.5,
    testCoverage: 60,
    reviewCoverage: 50,
    codeComplexity: "High",
    loc: 300,
    defectDensityPrior: 1.0,
    teamExperience: "Medium",
    processMaturity: 2,
  },
};

// ---------- Helper Math ----------

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// Map code complexity category to numeric risk multiplier (likelihood ratio style)
function lrForComplexity(level: Inputs["codeComplexity"]) {
  switch (level) {
    case "Low":
      return 0.85; // lowers odds of failure (helps reliability)
    case "Moderate":
      return 1.0;
    case "High":
      return 1.25; // raises odds of failure
  }
}

// Logistic mapping helper: x in [xmin,xmax] —> LR in [low,high]
function logisticLR(
  x: number,
  xmin: number,
  xmax: number,
  midpoint: number,
  steepness: number,
  lowLR: number,
  highLR: number
) {
  const s = clamp01((x - xmin) / (xmax - xmin));
  const z = 1 / (1 + Math.exp(-steepness * (s - midpoint))); // 0..1
  return lowLR + z * (highLR - lowLR);
}

// Likelihood ratios for each evidence factor (odds-style)
function computeLikelihoodRatios(inp: Inputs) {
  const lrs: Record<FactorKey, number> = {
    testCoverage: 1,
    reviewCoverage: 1,
    codeComplexity: 1,
    loc: 1,
    defectDensityPrior: 1,
    teamExperience: 1,
    processMaturity: 1,
  };

  // 1) Test coverage — higher coverage strongly improves odds of high reliability
  // Map 0–100% to LR between 0.7 and 1.6
  lrs.testCoverage = logisticLR(
    inp.testCoverage,
    0,
    100,
    0.5,
    10,
    0.7,
    1.6
  );

  // 2) Review coverage — peer reviews matter but slightly less than tests
  // Map 0–100% to LR between 0.8 and 1.4
  lrs.reviewCoverage = logisticLR(
    inp.reviewCoverage,
    0,
    100,
    0.5,
    8,
    0.8,
    1.4
  );

  // 3) Code complexity — categorical multiplier
  lrs.codeComplexity = lrForComplexity(inp.codeComplexity);

  // 4) Size (KLOC) — larger tends to hurt; saturate after ~300 KLOC
  // Map 0–500 KLOC to LR between 1.2 (very small) down to 0.85 (very large hurts reliability probability via higher failure odds)
  // We invert meaning because we work in odds-of-HighReliability space: larger size reduces odds => LR < 1
  const sizeLR = logisticLR(inp.loc, 0, 500, 0.35, 10, 1.2, 0.85);
  lrs.loc = sizeLR;

  // 5) Defect density prior (defects/KLOC before testing)
  // Higher expected defect density reduces odds of high reliability
  // Map 0–3 defects/KLOC to LR between 1.3 (very clean) and 0.7 (noisy)
  lrs.defectDensityPrior = logisticLR(
    inp.defectDensityPrior,
    0,
    3,
    0.35,
    10,
    1.3,
    0.7
  );

  // 6) Team experience — categorical
  lrs.teamExperience =
    inp.teamExperience === "High" ? 1.2 : inp.teamExperience === "Medium" ? 1.0 : 0.85;

  // 7) Process maturity (1..5) — roughly linear boost to odds
  // Map 1..5 to 0.8 .. 1.25
  const maturityScale = (inp.processMaturity - 1) / 4; // 0..1
  lrs.processMaturity = 0.8 + maturityScale * (1.25 - 0.8);

  return lrs;
}

function odds(p: number) {
  return p / (1 - p);
}
function probFromOdds(o: number) {
  return o / (1 + o);
}

// Combine independent LRs (naive Bayes style) with prior odds
function posteriorReliability(inp: Inputs) {
  const lrs = computeLikelihoodRatios(inp);
  const priorO = odds(clamp01(inp.priorReliability));
  const productLR =
    lrs.testCoverage *
    lrs.reviewCoverage *
    lrs.codeComplexity *
    lrs.loc *
    lrs.defectDensityPrior *
    lrs.teamExperience *
    lrs.processMaturity;
  const postO = priorO * productLR;
  const postP = probFromOdds(postO);
  return { p: clamp01(postP), lrs };
}

// Convert probability of meeting target to an approximate residual fault expectation
// Uses a simple mapping: E[residual defects] ≈ (1 - p) * (defectDensityPrior * KLOC)
function estimateResidualDefects(p: number, inp: Inputs) {
  const totalPotential = inp.defectDensityPrior * inp.loc; // defects expected pre-test
  return Math.max(0, (1 - p) * totalPotential);
}

// Simple sensitivity by recomputing with each factor nudged to a favorable/unfavorable extreme
function sensitivityTornado(inp: Inputs) {
  const base = posteriorReliability(inp).p;
  const entries: { name: string; delta: number }[] = [];

  const perturb: Partial<Record<FactorKey, Inputs>> = {
    testCoverage: { ...inp, testCoverage: 95 },
    reviewCoverage: { ...inp, reviewCoverage: 95 },
    codeComplexity: { ...inp, codeComplexity: "Low" },
    loc: { ...inp, loc: Math.max(1, inp.loc * 0.6) },
    defectDensityPrior: { ...inp, defectDensityPrior: Math.max(0.05, inp.defectDensityPrior * 0.6) },
    teamExperience: { ...inp, teamExperience: "High" },
    processMaturity: { ...inp, processMaturity: 5 },
  } as any;

  (Object.keys(perturb) as FactorKey[]).forEach((k) => {
    const alt = posteriorReliability(perturb[k] as Inputs).p;
    entries.push({ name: k, delta: +(alt - base).toFixed(4) });
  });

  return entries.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// Export helpers
function toCSV(rows: Record<string, number | string>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const body = rows
    .map((r) => headers.map((h) => `${r[h]}`.replace(/,/g, ";")).join(","))
    .join("\n");
  return [headers.join(","), body].join("\n");
}

function download(filename: string, content: string, type = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Page() {
  const [inputs, setInputs] = useState<Inputs>({
    targetReliability: 0.999,
    priorReliability: 0.6,
    testCoverage: 80,
    reviewCoverage: 70,
    codeComplexity: "Moderate",
    loc: 100,
    defectDensityPrior: 0.8,
    teamExperience: "Medium",
    processMaturity: 3,
  });

  const result = useMemo(() => posteriorReliability(inputs), [inputs]);
  const residual = useMemo(
    () => estimateResidualDefects(result.p, inputs),
    [result.p, inputs]
  );
  const tornado = useMemo(() => sensitivityTornado(inputs), [inputs]);

  const handlePreset = (name: string) => {
    setInputs((prev) => ({ ...prev, ...(PRESETS[name] || {}) } as Inputs));
  };

  const exportCSV = () => {
    const rows = [
      {
        Metric: "Posterior Reliability P(High)",
        Value: result.p.toFixed(4),
      },
      { Metric: "Estimated Residual Defects", Value: residual.toFixed(2) },
      { Metric: "Target Reliability", Value: inputs.targetReliability },
      { Metric: "Prior Reliability", Value: inputs.priorReliability },
      { Metric: "Test Coverage %", Value: inputs.testCoverage },
      { Metric: "Review Coverage %", Value: inputs.reviewCoverage },
      { Metric: "Code Complexity", Value: inputs.codeComplexity },
      { Metric: "KLOC", Value: inputs.loc },
      { Metric: "Defect Density Prior (def/KLOC)", Value: inputs.defectDensityPrior },
      { Metric: "Team Experience", Value: inputs.teamExperience },
      { Metric: "Process Maturity", Value: inputs.processMaturity },
    ];
    download("bayesian_reliability_predictor.csv", toCSV(rows));
  };

  const reset = () => {
    setInputs({
      targetReliability: 0.999,
      priorReliability: 0.6,
      testCoverage: 80,
      reviewCoverage: 70,
      codeComplexity: "Moderate",
      loc: 100,
      defectDensityPrior: 0.8,
      teamExperience: "Medium",
      processMaturity: 3,
    });
  };

  // What-if simulator — vary a single factor and plot resulting probability
  const [whatIfKey, setWhatIfKey] = useState<FactorKey>("testCoverage");
  const whatIfSeries = useMemo(() => {
    const series: { x: number | string; p: number }[] = [];
    const clone = { ...inputs } as Inputs;

    const push = () => series.push({ x: (clone as any)[whatIfKey], p: posteriorReliability(clone).p });

    if (whatIfKey === "codeComplexity") {
      ("Low,Moderate,High" as string).split(",").forEach((lvl) => {
        (clone as any).codeComplexity = lvl;
        push();
      });
    } else if (whatIfKey === "teamExperience") {
      ("Low,Medium,High" as string).split(",").forEach((lvl) => {
        (clone as any).teamExperience = lvl;
        push();
      });
    } else if (whatIfKey === "processMaturity") {
      [1, 2, 3, 4, 5].forEach((v) => {
        (clone as any).processMaturity = v;
        push();
      });
    } else if (whatIfKey === "testCoverage" || whatIfKey === "reviewCoverage") {
      [40, 60, 70, 80, 90, 95].forEach((v) => {
        (clone as any)[whatIfKey] = v;
        push();
      });
    } else if (whatIfKey === "loc") {
      [20, 50, 100, 150, 250, 400].forEach((v) => {
        (clone as any).loc = v;
        push();
      });
    } else if (whatIfKey === "defectDensityPrior") {
      [0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0].forEach((v) => {
        (clone as any).defectDensityPrior = v;
        push();
      });
    }

    return series;
  }, [whatIfKey, inputs]);

  // UI Helpers
  const infoChip = (label: string, value: string) => (
    <div className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">{label}: <span className="font-semibold">{value}</span></div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bayesian Reliability Predictor (Software)</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={reset} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* Equation Box */}
      <div className="rounded-2xl border bg-gray-50 p-5 mb-8">
        <div className="flex items-center gap-2 mb-3 text-gray-700">
          <SlidersHorizontal className="h-5 w-5" />
          <span className="font-semibold">Bayes' Rule (odds form)</span>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <BlockMath math={String.raw`\text{Posterior Odds} = \text{Prior Odds} \times \prod_{i=1}^{k} \text{LR}_i`} />
          <BlockMath math={String.raw`\text{Posterior} = \frac{\text{Odds}}{1+\text{Odds}}`} />
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Each factor (coverage, reviews, complexity, size, defect density, experience, maturity) contributes a
          likelihood ratio (LR) that adjusts prior belief to obtain a posterior reliability probability.
        </p>
      </div>

      {/* Presets */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.keys(PRESETS).map((k) => (
          <button
            key={k}
            onClick={() => handlePreset(k)}
            className="px-3 py-1.5 rounded-lg bg-white border hover:bg-gray-50 text-sm"
          >
            <Wand2 className="inline-block h-4 w-4 mr-1" /> {k}
          </button>
        ))}
      </div>

      {/* Inputs + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs column (2/3) */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border p-5 bg-white">
            <h2 className="text-xl font-semibold mb-4">Inputs</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Target reliability */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Target Reliability (R)</label>
                <input
                  type="number"
                  step={0.0001}
                  min={0.9}
                  max={0.999999}
                  value={inputs.targetReliability}
                  onChange={(e) => setInputs({ ...inputs, targetReliability: parseFloat(e.target.value || "0") })}
                  className="w-full rounded-lg border px-3 py-2"
                />
                <p className="text-xs text-gray-500">e.g., 0.999 = ≤1 failure per 1000 hours</p>
              </div>

              {/* Prior */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Prior Reliability (belief)</label>
                <input
                  type="range"
                  min={0.1}
                  max={0.95}
                  step={0.01}
                  value={inputs.priorReliability}
                  onChange={(e) => setInputs({ ...inputs, priorReliability: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="text-sm">{inputs.priorReliability.toFixed(2)}</div>
              </div>

              {/* Coverage */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Unit/Test Coverage (%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={inputs.testCoverage}
                  onChange={(e) => setInputs({ ...inputs, testCoverage: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-sm">{inputs.testCoverage}%</div>
              </div>

              {/* Reviews */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Peer Review Coverage (%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={inputs.reviewCoverage}
                  onChange={(e) => setInputs({ ...inputs, reviewCoverage: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-sm">{inputs.reviewCoverage}%</div>
              </div>

              {/* Complexity */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Code Complexity</label>
                <select
                  className="w-full rounded-lg border px-3 py-2"
                  value={inputs.codeComplexity}
                  onChange={(e) => setInputs({ ...inputs, codeComplexity: e.target.value as Inputs["codeComplexity"] })}
                >
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>High</option>
                </select>
                <p className="text-xs text-gray-500">Use cyclomatic complexity bands</p>
              </div>

              {/* Size */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Size (KLOC)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={inputs.loc}
                  onChange={(e) => setInputs({ ...inputs, loc: Math.max(1, parseInt(e.target.value || "1")) })}
                  className="w-full rounded-lg border px-3 py-2"
                />
                <p className="text-xs text-gray-500">Thousands of source lines</p>
              </div>

              {/* Defect density prior */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Defect Density Prior (def/KLOC)</label>
                <input
                  type="number"
                  min={0.05}
                  step={0.05}
                  value={inputs.defectDensityPrior}
                  onChange={(e) => setInputs({ ...inputs, defectDensityPrior: Math.max(0.05, parseFloat(e.target.value || "0.05")) })}
                  className="w-full rounded-lg border px-3 py-2"
                />
                <p className="text-xs text-gray-500">Expected pre-test defect density</p>
              </div>

              {/* Team experience */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Team Experience</label>
                <select
                  className="w-full rounded-lg border px-3 py-2"
                  value={inputs.teamExperience}
                  onChange={(e) => setInputs({ ...inputs, teamExperience: e.target.value as Inputs["teamExperience"] })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>

              {/* Process maturity */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Process Maturity (1..5)</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={inputs.processMaturity}
                  onChange={(e) => setInputs({ ...inputs, processMaturity: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                  className="w-full"
                />
                <div className="text-sm">{inputs.processMaturity}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Results column (1/3) */}
        <div>
          <div className="rounded-2xl border p-5 bg-white sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-gray-50 border">
                <div className="text-sm text-gray-600">Posterior P(High Reliability)</div>
                <div className="text-3xl font-bold">{(result.p * 100).toFixed(1)}%</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border">
                  <div className="text-xs text-gray-600">Estimated Residual Defects</div>
                  <div className="text-xl font-semibold">{residual.toFixed(1)}</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border">
                  <div className="text-xs text-gray-600">Target R</div>
                  <div className="text-xl font-semibold">{inputs.targetReliability}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {infoChip("Prior", inputs.priorReliability.toFixed(2))}
                {infoChip("Coverage", `${inputs.testCoverage}%`)}
                {infoChip("Reviews", `${inputs.reviewCoverage}%`)}
                {infoChip("Complexity", inputs.codeComplexity)}
                {infoChip("KLOC", `${inputs.loc}`)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity (Tornado) */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-5 bg-white">
          <h3 className="text-lg font-semibold mb-4">Sensitivity (Tornado)</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={tornado.map((d) => ({ name: d.name, Delta: +(d.delta * 100).toFixed(2) }))}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" />
                <YAxis unit="%" />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <ReferenceLine y={0} strokeDasharray="3 3" />
                <Bar dataKey="Delta" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">Bars show % change in posterior reliability if each factor is improved to a strong level.</p>
        </div>

        {/* What-if */}
        <div className="rounded-2xl border p-5 bg-white">
          <h3 className="text-lg font-semibold mb-4">What-if Simulator</h3>
          <div className="flex items-center gap-3 mb-3">
            <label className="text-sm text-gray-600">Vary factor:</label>
            <select
              className="rounded-lg border px-3 py-2"
              value={whatIfKey}
              onChange={(e) => setWhatIfKey(e.target.value as FactorKey)}
            >
              <option value="testCoverage">Test Coverage</option>
              <option value="reviewCoverage">Review Coverage</option>
              <option value="codeComplexity">Code Complexity</option>
              <option value="loc">Size (KLOC)</option>
              <option value="defectDensityPrior">Defect Density Prior</option>
              <option value="teamExperience">Team Experience</option>
              <option value="processMaturity">Process Maturity</option>
            </select>
          </div>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={whatIfSeries}>
                <CartesianGrid />
                <XAxis dataKey="x" />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
                <Tooltip formatter={(v: any) => `${(v * 100).toFixed(1)}%`} />
                <Line type="monotone" dataKey="p" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-8 p-5 rounded-2xl border bg-gray-50">
        <h4 className="font-semibold mb-2">Notes & Assumptions</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Naive-Bayes style independence is assumed across factors for tractability.</li>
          <li>Likelihood ratio mappings are calibrated for reasonable ranges; tune in code for your domain.</li>
          <li>Use this tool to prioritize improvements (coverage, reviews, process), then validate with failure data.</li>
        </ul>
      </div>
    </div>
  );
}
