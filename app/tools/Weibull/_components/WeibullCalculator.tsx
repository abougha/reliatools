"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
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

export default function WeibullCalculator() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [unitsLabel, setUnitsLabel] = useState("hours");
  const [missionTime, setMissionTime] = useState("200");
  const [confidenceLevel, setConfidenceLevel] = useState("90");
  const [yAxisMode, setYAxisMode] = useState<"UNRELIABILITY" | "RELIABILITY">("UNRELIABILITY");
  const [showBLifeLines, setShowBLifeLines] = useState(true);
  const [showConfidenceBand, setShowConfidenceBand] = useState(false);
  const [showSuspensions, setShowSuspensions] = useState(true);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [selfTestErrors, setSelfTestErrors] = useState<string[]>([]);

  useEffect(() => {
    const result = runInternalWeibullSelfTest();
    if (!result.pass) {
      setSelfTestErrors(result.errors);
    }
  }, []);

  const missionTimeValue = Number(missionTime);
  const missionTimeValid = Number.isFinite(missionTimeValue) && missionTimeValue > 0 ? missionTimeValue : undefined;

  const computedDatasets = useMemo<ComputedDataset[]>(
    () =>
      datasets.map((dataset) => {
        const output = fitDataset(dataset.data, dataset.method, missionTimeValid);
        return {
          ...dataset,
          fit: output.fit,
          warnings: output.warnings,
          error: output.error,
        };
      }),
    [datasets, missionTimeValid],
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
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Weibull Analysis Calculator</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => setUploaderOpen(true)} className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
            Add dataset
          </button>
          <button type="button" onClick={loadSampleDatasets} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Load sample
          </button>
        </div>
      </div>

      <div className="mb-6 rounded border bg-gray-50 p-4">
        <BlockMath math={"F(t)=1-e^{-\\left(\\frac{t}{\\eta}\\right)^{\\beta}},\\quad R(t)=e^{-\\left(\\frac{t}{\\eta}\\right)^{\\beta}}"} />
        <p className="mt-2 text-sm text-gray-700">
          Probability paper transform: <strong>x = ln(t)</strong> and <strong>y = ln(ln(1/(1-F)))</strong>. Default fitting: MLE when any censored
          data exists, otherwise regression.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded border bg-white p-4 md:grid-cols-2">
        <label className="text-sm">
          Units label
          <input
            type="text"
            value={unitsLabel}
            onChange={(event) => setUnitsLabel(event.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder="hours"
          />
        </label>
        <label className="text-sm">
          Mission time ({unitsLabel || "units"})
          <input
            type="number"
            min={0}
            value={missionTime}
            onChange={(event) => setMissionTime(event.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="text-sm">
          Confidence level (%), v2 placeholder
          <input
            type="number"
            value={confidenceLevel}
            onChange={(event) => setConfidenceLevel(event.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <div className="text-sm space-y-2">
          <label className="block">
            Y-axis mode
            <select
              value={yAxisMode}
              onChange={(event) => setYAxisMode(event.target.value as "UNRELIABILITY" | "RELIABILITY")}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="UNRELIABILITY">Unreliability F(t)</option>
              <option value="RELIABILITY">Reliability R(t)</option>
            </select>
          </label>
          <p className="font-medium">Plot toggles</p>
          <label className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={showBLifeLines} onChange={(event) => setShowBLifeLines(event.target.checked)} />
            Show B-life lines
          </label>
          <label className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={showSuspensions} onChange={(event) => setShowSuspensions(event.target.checked)} />
            Show suspensions
          </label>
          <label className="mt-1 flex items-center gap-2 text-gray-500">
            <input
              type="checkbox"
              checked={showConfidenceBand}
              onChange={(event) => setShowConfidenceBand(event.target.checked)}
              disabled
            />
            Show confidence band (v2)
          </label>
        </div>
      </div>

      {missionTime && !missionTimeValid ? <p className="mb-4 text-sm text-red-700">Mission time must be a positive number.</p> : null}

      {selfTestErrors.length > 0 ? (
        <div className="mb-6 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
          {selfTestErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      {uploaderOpen ? <DatasetUploader isOpen={uploaderOpen} onClose={() => setUploaderOpen(false)} onAddDataset={onAddDataset} /> : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="space-y-4 rounded border bg-white p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Datasets</h2>
            <span className="text-xs text-gray-500">
              {datasets.length} total, {fittedCount} fitted
            </span>
          </div>

          {computedDatasets.length === 0 ? <p className="text-sm text-gray-600">No datasets yet. Add one from CSV paste/upload.</p> : null}

          <div className="space-y-3">
            {computedDatasets.map((dataset) => {
              const nFail = dataset.data.filter((point) => point.status === "FAIL").length;
              const nSusp = dataset.data.length - nFail;
              const forcedRegressionWithSusp = dataset.method === "REGRESSION" && nSusp > 0;

              return (
                <div key={dataset.id} className="rounded border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: dataset.colorKey }} />
                    <input
                      type="text"
                      value={dataset.name}
                      onChange={(event) => updateDataset(dataset.id, { name: event.target.value })}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>

                  <div className="mb-2 flex items-center justify-between text-xs text-gray-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={dataset.visible}
                        onChange={(event) => updateDataset(dataset.id, { visible: event.target.checked })}
                      />
                      Visible
                    </label>
                    <span>
                      FAIL {nFail} / SUSP {nSusp}
                    </span>
                  </div>

                  <label className="block text-xs">
                    Fit method
                    <select
                      value={dataset.method}
                      onChange={(event) => updateDataset(dataset.id, { method: event.target.value as FitMethod })}
                      className="mt-1 w-full rounded border p-1.5 text-sm"
                    >
                      <option value="REGRESSION">Regression</option>
                      <option value="MLE">MLE</option>
                    </select>
                  </label>

                  {forcedRegressionWithSusp ? (
                    <p className="mt-2 text-xs text-amber-700">Regression is forced with censoring present. MLE is usually recommended.</p>
                  ) : null}

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeDataset(dataset.id)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6 lg:col-span-2">
          <WeibullPlot
            datasets={computedDatasets}
            unitsLabel={unitsLabel || "units"}
            showBLifeLines={showBLifeLines}
            showSuspensions={showSuspensions}
            tMission={missionTimeValid}
            yAxisMode={yAxisMode}
          />

          <div className="rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">Active mission time: {missionTimeValid ? `${formatNumber(missionTimeValid)} ${unitsLabel}` : "N/A"}</p>
            <p className="mt-1">Per dataset outputs include beta, eta, B1/B10/B50, MTTF, and mission reliability R(t).</p>
            {showConfidenceBand ? <p className="mt-1 text-xs">Confidence bands are placeholder-only in v1.</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadSummary}
              disabled={fittedCount === 0}
              className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={downloadPlotPoints}
              disabled={fittedCount === 0}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Download plot points
            </button>
          </div>

          <ResultsTable datasets={computedDatasets} unitsLabel={unitsLabel || "units"} />
        </section>
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
