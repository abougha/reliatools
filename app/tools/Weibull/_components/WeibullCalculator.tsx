"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import DatasetEditor from "./DatasetEditor";
import DatasetUploader from "./DatasetUploader";
import ResultsTable from "./ResultsTable";
import WeibullPlot from "./WeibullPlot";
import {
  buildPlotPointsCsv,
  buildSummaryCsv,
  buildSummaryRows,
  triggerCsvDownload,
} from "../_lib/csv";
import {
  chooseDefaultMethod,
  fitDataset,
  runInternalWeibullSelfTest,
  type DataPoint,
  type FitMethod,
  type FitResult,
} from "../_lib/weibullMath";
import ContactCTA from "@/components/ContactCTA";

type Dataset = {
  id: string;
  name: string;
  colorKey: string;
  data: DataPoint[];
  visible: boolean;
  method: FitMethod;
  fit?: FitResult;
};

type ComputedDataset = Dataset & {
  warnings: string[];
  error?: string;
};

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#7c3aed", "#f59e0b", "#0891b2", "#be123c", "#334155"];

const UNIT_PRESETS = ["hours", "cycles", "days", "km", "miles"];
const CUSTOM_UNITS_VALUE = "__custom__";

const SAMPLE_ALL_FAIL: DataPoint[] = [
  { t: 120, status: "FAIL" },
  { t: 150, status: "FAIL" },
  { t: 180, status: "FAIL" },
  { t: 220, status: "FAIL" },
  { t: 270, status: "FAIL" },
  { t: 330, status: "FAIL" },
];

const SAMPLE_WITH_SUSP: DataPoint[] = [
  { t: 90, status: "FAIL" },
  { t: 110, status: "SUSP" },
  { t: 130, status: "FAIL" },
  { t: 150, status: "SUSP" },
  { t: 185, status: "FAIL" },
  { t: 230, status: "SUSP" },
];

const MONO = { fontFamily: "var(--font-weibull-mono)" } as const;
const SERIF_ITALIC = { fontFamily: "var(--font-weibull-serif)" } as const;

const FIELD_LABEL_CLASS = "block text-[10px] font-semibold uppercase tracking-wide text-[#5b6470]";
const FIELD_CONTROL_CLASS =
  "mt-1.5 rounded-lg border border-[#d5dae1] bg-white px-3 py-2 text-sm text-[#1a2027] focus:border-[#2563eb] focus:outline-none";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dataset-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function formatNumber(value: number | undefined, digits = 4): string {
  if (value === undefined || !Number.isFinite(value)) return "N/A";
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function ToggleChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
        checked ? "border-[#cddcfb] bg-[#eff4ff] text-[#1d4ed8]" : "border-[#d5dae1] bg-white text-[#5b6470]"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="hidden" />
      <span
        className={`inline-block h-3.5 w-3.5 rounded-sm border ${
          checked ? "border-[#2563eb] bg-[#2563eb]" : "border-[#d5dae1] bg-white"
        }`}
      />
      {label}
    </label>
  );
}

export default function WeibullCalculator() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [unitsPreset, setUnitsPreset] = useState<string>("hours");
  const [customUnitsLabel, setCustomUnitsLabel] = useState("");
  const [missionTime, setMissionTime] = useState("200");
  const [confidenceLevel, setConfidenceLevel] = useState("90");
  const [yAxisMode, setYAxisMode] = useState<"UNRELIABILITY" | "RELIABILITY">("UNRELIABILITY");
  const [showBLifeLines, setShowBLifeLines] = useState(true);
  const [showConfidenceBand, setShowConfidenceBand] = useState(false);
  const [showSuspensions, setShowSuspensions] = useState(true);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [expandedDatasetIds, setExpandedDatasetIds] = useState<Set<string>>(new Set());
  const [railView, setRailView] = useState<"datasets" | "table">("datasets");
  const [selfTestErrors, setSelfTestErrors] = useState<string[]>([]);

  const unitsLabel = unitsPreset === CUSTOM_UNITS_VALUE ? customUnitsLabel : unitsPreset;

  useEffect(() => {
    const result = runInternalWeibullSelfTest();
    if (!result.pass) {
      setSelfTestErrors(result.errors);
    }
  }, []);

  const missionTimeValue = Number(missionTime);
  const missionTimeValid = Number.isFinite(missionTimeValue) && missionTimeValue > 0 ? missionTimeValue : undefined;

  const confidenceLevelValue = Number(confidenceLevel);
  const confidenceLevelValid =
    Number.isInteger(confidenceLevelValue) && confidenceLevelValue >= 50 && confidenceLevelValue <= 99;
  const effectiveConfidenceLevel = confidenceLevelValid ? confidenceLevelValue : 90;

  const computedDatasets = useMemo<ComputedDataset[]>(
    () =>
      datasets.map((dataset) => {
        const output = fitDataset(dataset.data, dataset.method, missionTimeValid, effectiveConfidenceLevel);
        return {
          ...dataset,
          fit: output.fit,
          warnings: output.warnings,
          error: output.error,
        };
      }),
    [datasets, missionTimeValid, effectiveConfidenceLevel],
  );

  const fittedCount = computedDatasets.filter((dataset) => dataset.fit).length;

  const onAddDataset = (payload: { name: string; data: DataPoint[] }) => {
    setDatasets((prev) => {
      const colorKey = COLORS[prev.length % COLORS.length];
      const method = chooseDefaultMethod(payload.data);
      return [
        ...prev,
        {
          id: createId(),
          name: payload.name,
          colorKey,
          data: payload.data,
          visible: true,
          method,
        },
      ];
    });
  };

  const removeDataset = (id: string) => {
    setDatasets((prev) => prev.filter((dataset) => dataset.id !== id));
  };

  const updateDataset = (id: string, patch: Partial<Dataset>) => {
    setDatasets((prev) =>
      prev.map((dataset) => {
        if (dataset.id !== id) return dataset;
        return { ...dataset, ...patch };
      }),
    );
  };

  const toggleDatasetExpanded = (id: string) => {
    setExpandedDatasetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const loadSampleDatasets = () => {
    const sampleSets: Dataset[] = [
      {
        id: createId(),
        name: "Sample - all failures",
        colorKey: COLORS[0],
        data: SAMPLE_ALL_FAIL,
        visible: true,
        method: "REGRESSION",
      },
      {
        id: createId(),
        name: "Sample - with suspensions",
        colorKey: COLORS[1],
        data: SAMPLE_WITH_SUSP,
        visible: true,
        method: "MLE",
      },
    ];
    setDatasets(sampleSets);
  };

  const downloadSummary = () => {
    const rows = buildSummaryRows(computedDatasets.map((dataset) => ({ name: dataset.name, fit: dataset.fit })));
    if (rows.length === 0) return;
    triggerCsvDownload("weibull-summary.csv", buildSummaryCsv(rows));
  };

  const downloadPlotPoints = () => {
    const rows = computedDatasets.flatMap((dataset) => {
      if (!dataset.fit) return [];
      return dataset.fit.plotPoints.map((point) => ({
        dataset: dataset.name,
        t: point.t,
        status: point.status,
        F_plot: point.F_plot,
        y_plot: point.y_plot,
      }));
    });
    if (rows.length === 0) return;
    triggerCsvDownload("weibull-plot-points.csv", buildPlotPointsCsv(rows));
  };

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 md:py-10" style={{ fontFamily: "var(--font-weibull-sans)" }}>
      <div
        className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white"
        style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 16px 40px -20px rgba(16,24,40,.22)" }}
      >
        {/* A. Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef1f4] px-7 py-[22px]">
          <div>
            <h1 className="text-[22px] font-bold text-[#1a2027]">Weibull Analysis Calculator</h1>
            <p className="mt-1 text-[13px] text-[#8a929c]">
              Life-data analysis &middot; probability plot &middot; B-life &amp; mission reliability
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadSampleDatasets}
              className="rounded-lg border border-[#d5dae1] px-4 py-2 text-sm font-medium text-[#5b6470] hover:bg-[#f8fafc]"
            >
              Load sample
            </button>
            <button
              type="button"
              onClick={() => setUploaderOpen(true)}
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8]"
            >
              + Add dataset
            </button>
          </div>
        </div>

        {/* B. Formula strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef1f4] bg-[#f8fafc] px-7 py-4">
          <p className="text-[19px] italic text-[#1a2027]" style={SERIF_ITALIC}>
            F(t) = 1 &minus; e<sup>&minus;(t/&eta;)<sup>&beta;</sup></sup> &middot; R(t) = e
            <sup>&minus;(t/&eta;)<sup>&beta;</sup></sup>
          </p>
          <p className="text-xs text-[#5b6470]">
            <span style={MONO}>x = ln(t)</span>, <span style={MONO}>y = ln(ln(1/(1&minus;F)))</span> &middot; Default fit: MLE
            when censored data exists, otherwise regression.
          </p>
        </div>

        {/* C. Settings strip */}
        <div className="flex flex-wrap items-end gap-[22px] border-b border-[#eef1f4] bg-[#fcfcfd] px-7 py-4">
          <label className="text-sm">
            <span className={FIELD_LABEL_CLASS}>Units</span>
            <select
              value={unitsPreset}
              onChange={(event) => setUnitsPreset(event.target.value)}
              className={`${FIELD_CONTROL_CLASS} block w-36`}
            >
              {UNIT_PRESETS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
              <option value={CUSTOM_UNITS_VALUE}>Custom&hellip;</option>
            </select>
            {unitsPreset === CUSTOM_UNITS_VALUE ? (
              <input
                type="text"
                value={customUnitsLabel}
                onChange={(event) => setCustomUnitsLabel(event.target.value)}
                placeholder="e.g., landings"
                className={`${FIELD_CONTROL_CLASS} block w-36`}
              />
            ) : null}
          </label>

          <label className="text-sm">
            <span className={FIELD_LABEL_CLASS}>Mission time ({unitsLabel || "units"})</span>
            <input
              type="number"
              min={0}
              value={missionTime}
              onChange={(event) => setMissionTime(event.target.value)}
              className={`${FIELD_CONTROL_CLASS} block w-36`}
              style={MONO}
            />
          </label>

          <label className="text-sm">
            <span className={FIELD_LABEL_CLASS}>Confidence (%)</span>
            <input
              type="number"
              min={50}
              max={99}
              step={1}
              value={confidenceLevel}
              onChange={(event) => setConfidenceLevel(event.target.value)}
              className={`${FIELD_CONTROL_CLASS} block w-28`}
              style={MONO}
            />
          </label>

          <label className="text-sm">
            <span className={FIELD_LABEL_CLASS}>Y-axis mode</span>
            <select
              value={yAxisMode}
              onChange={(event) => setYAxisMode(event.target.value as "UNRELIABILITY" | "RELIABILITY")}
              className={`${FIELD_CONTROL_CLASS} block w-48`}
            >
              <option value="UNRELIABILITY">Unreliability F(t)</option>
              <option value="RELIABILITY">Reliability R(t)</option>
            </select>
          </label>

          <div className="flex-1" />

          <div className="flex flex-wrap gap-2">
            <ToggleChip label="B-life lines" checked={showBLifeLines} onChange={setShowBLifeLines} />
            <ToggleChip label="Suspensions" checked={showSuspensions} onChange={setShowSuspensions} />
            <ToggleChip label="Confidence band" checked={showConfidenceBand} onChange={setShowConfidenceBand} />
          </div>
        </div>

        {(confidenceLevel && !confidenceLevelValid) || (missionTime && !missionTimeValid) || selfTestErrors.length > 0 ? (
          <div className="space-y-2 border-b border-[#eef1f4] px-7 py-3">
            {confidenceLevel && !confidenceLevelValid ? (
              <p className="text-xs text-red-700">Confidence level must be a whole number between 50 and 99.</p>
            ) : null}
            {missionTime && !missionTimeValid ? <p className="text-xs text-red-700">Mission time must be a positive number.</p> : null}
            {selfTestErrors.length > 0 ? (
              <div className="rounded-lg border-l-[3px] border-[#f79009] bg-[#fffaeb] p-3 text-xs text-[#b54708]">
                {selfTestErrors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {uploaderOpen ? (
          <div className="border-b border-[#eef1f4] px-7 py-5">
            <DatasetUploader isOpen={uploaderOpen} onClose={() => setUploaderOpen(false)} onAddDataset={onAddDataset} />
          </div>
        ) : null}

        {/* D. Plot + datasets rail */}
        {computedDatasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 px-7 py-16 text-center">
            <p className="max-w-md text-sm text-[#5b6470]">
              Fit failure data to a Weibull distribution — supports censored (suspended) data, multiple datasets, and confidence bounds.
            </p>
            <p className="text-sm text-[#8a929c]">Use Load sample or + Add dataset above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 p-7 lg:grid-cols-[1fr_340px]">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#1a2027]">Weibull probability plot</h2>
                <span className="text-xs text-[#8a929c]" style={MONO}>
                  y-axis: {yAxisMode === "RELIABILITY" ? "Reliability R(t)" : "Unreliability F(t)"}
                </span>
              </div>
              <WeibullPlot
                datasets={computedDatasets}
                unitsLabel={unitsLabel || "units"}
                showBLifeLines={showBLifeLines}
                showSuspensions={showSuspensions}
                showConfidenceBand={showConfidenceBand}
                tMission={missionTimeValid}
                yAxisMode={yAxisMode}
              />
            </section>

            <aside className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-lg bg-[#f1f5f9] p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setRailView("datasets")}
                    className={`rounded-md px-3 py-1.5 ${
                      railView === "datasets" ? "bg-white text-[#1a2027] shadow-sm" : "text-[#5b6470]"
                    }`}
                  >
                    Datasets
                  </button>
                  <button
                    type="button"
                    onClick={() => setRailView("table")}
                    className={`rounded-md px-3 py-1.5 ${
                      railView === "table" ? "bg-white text-[#1a2027] shadow-sm" : "text-[#5b6470]"
                    }`}
                  >
                    Data table
                  </button>
                </div>
                <span className="text-xs text-[#8a929c]" style={MONO}>
                  {datasets.length} total &middot; {fittedCount} fitted
                </span>
              </div>

              <div className="space-y-3">
                {computedDatasets.map((dataset) => {
                  const nFail = dataset.data.filter((point) => point.status === "FAIL").length;
                  const nSusp = dataset.data.length - nFail;
                  const forcedRegressionWithSusp = dataset.method === "REGRESSION" && nSusp > 0;
                  const isExpanded = railView === "table" || expandedDatasetIds.has(dataset.id);

                  return (
                    <div key={dataset.id} className="rounded-xl border border-[#e4e7ec] bg-white p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: dataset.colorKey }} />
                        <input
                          type="text"
                          value={dataset.name}
                          onChange={(event) => updateDataset(dataset.id, { name: event.target.value })}
                          className="w-full rounded-lg border border-[#d5dae1] px-2 py-1 text-sm font-medium text-[#1a2027] focus:border-[#2563eb] focus:outline-none"
                        />
                      </div>

                      <div className="mb-2 flex items-center justify-between text-xs text-[#5b6470]">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={dataset.visible}
                            onChange={(event) => updateDataset(dataset.id, { visible: event.target.checked })}
                          />
                          Visible
                        </label>
                        <span style={MONO}>
                          FAIL {nFail} &middot; SUSP {nSusp}
                        </span>
                      </div>

                      <label className="block text-xs">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8a929c]">Fit method</span>
                        <select
                          value={dataset.method}
                          onChange={(event) => updateDataset(dataset.id, { method: event.target.value as FitMethod })}
                          className="mt-1 w-full rounded-lg border border-[#d5dae1] p-1.5 text-sm text-[#1a2027]"
                        >
                          <option value="REGRESSION">Regression</option>
                          <option value="MLE">MLE</option>
                        </select>
                      </label>

                      {forcedRegressionWithSusp ? (
                        <p className="mt-2 text-xs text-[#b54708]">Regression is forced with censoring present. MLE is usually recommended.</p>
                      ) : null}

                      <div className="mt-3 flex items-center justify-between border-t border-[#eef1f4] pt-2">
                        <button
                          type="button"
                          onClick={() => toggleDatasetExpanded(dataset.id)}
                          className="text-xs font-medium text-[#2563eb] hover:underline"
                        >
                          {isExpanded ? "Hide data" : "View / edit data"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDataset(dataset.id)}
                          className="rounded-lg border border-[#f0c9c9] px-2 py-1 text-xs text-[#c0362c] hover:bg-[#fff5f5]"
                        >
                          Remove
                        </button>
                      </div>

                      {isExpanded ? <DatasetEditor data={dataset.data} onChange={(data) => updateDataset(dataset.id, { data })} /> : null}
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* E. Results section */}
        {computedDatasets.length > 0 ? (
          <div className="border-t border-[#eef1f4] bg-[#fcfcfd] px-7 py-[22px] pb-[26px]">
            <div className="mb-4 rounded-lg border-l-[3px] border-[#2563eb] bg-[#eff4ff] p-4 text-sm text-[#1a2027]">
              <p className="font-bold">
                Active mission time: {missionTimeValid ? `${formatNumber(missionTimeValid)} ${unitsLabel}` : "N/A"}
              </p>
              <p className="mt-1 text-[#5b6470]">
                Per-dataset outputs include beta, eta, B1 / B10 / B50, MTTF, and mission reliability R(t).
              </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadSummary}
                disabled={fittedCount === 0}
                className="rounded-lg bg-[#079455] px-4 py-2 text-sm font-medium text-white hover:bg-[#067a47] disabled:opacity-50"
              >
                &#8595; Download CSV
              </button>
              <button
                type="button"
                onClick={downloadPlotPoints}
                disabled={fittedCount === 0}
                className="rounded-lg border border-[#d5dae1] px-4 py-2 text-sm font-medium text-[#5b6470] hover:bg-[#f8fafc] disabled:opacity-50"
              >
                Download plot points
              </button>
            </div>

            <ResultsTable datasets={computedDatasets} unitsLabel={unitsLabel || "units"} />

            <p className="mt-4 text-xs text-[#8a929c]">
              Fisher-matrix two-sided bounds at the selected confidence level. Bounds for regression fits are approximate (evaluated at the
              regression point estimate).
            </p>
          </div>
        ) : null}
      </div>

      <ContactCTA variant="tool" />

      <section className="mt-12 border-t pt-8 text-sm text-gray-600">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">How it works</h2>
        <p className="mb-4">
          Weibull analysis fits failure data to a distribution defined by a shape parameter <strong>&beta;</strong>{" "}
          and a characteristic life <strong>&eta;</strong>. The reliability at time <em>t</em> is:
        </p>
        <BlockMath math={"R(t) = \\exp\\!\\left[-\\left(\\frac{t}{\\eta}\\right)^{\\beta}\\right]"} />
        <p className="mb-4">
          The shape parameter tells you the failure mode: <strong>&beta;&nbsp;&lt;&nbsp;1</strong> is infant
          mortality (early failures), <strong>&beta;&nbsp;&asymp;&nbsp;1</strong> is random failure, and{" "}
          <strong>&beta;&nbsp;&gt;&nbsp;1</strong> is wear-out.
        </p>
        <p className="mb-4">
          <strong>Example:</strong> For &eta;&nbsp;=&nbsp;10,000&nbsp;h and &beta;&nbsp;=&nbsp;2, the{" "}
          <strong>B10 life</strong> (time at which 10% have failed) is about <strong>3,250&nbsp;h</strong>, the{" "}
          <strong>mean life (MTTF)</strong> is about <strong>8,860&nbsp;h</strong>, and reliability at
          5,000&nbsp;h is about <strong>0.78</strong>. The calculator reports &beta;, &eta;, B-life, MTTF, and
          reliability at any time, and supports censored (suspended) data.
        </p>
        <p>
          Use this to turn field or test failure data into quantitative life predictions and to distinguish infant
          mortality from wear-out. Pair it with the{" "}
          <Link href="/tools/Samplesize" className="text-blue-600 hover:underline">
            Sample Size calculator
          </Link>{" "}
          when planning the test that generates the data.
        </p>
      </section>
    </div>
  );
}
