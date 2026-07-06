"use client";

import { classifyBeta, interpretFit, type FitResult, type ParamBounds } from "../_lib/weibullMath";

type ResultDataset = {
  id: string;
  name: string;
  colorKey: string;
  visible: boolean;
  fit?: FitResult;
  warnings: string[];
  error?: string;
};

type ResultsTableProps = {
  datasets: ResultDataset[];
  unitsLabel: string;
};

function formatMetric(value: number | undefined, digits = 4): string {
  if (value === undefined || !Number.isFinite(value)) return "N/A";
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function formatBoundsRange(bounds: ParamBounds | undefined, digits = 2): string | null {
  if (!bounds || !Number.isFinite(bounds.lower) || !Number.isFinite(bounds.upper)) return null;
  return `[${bounds.lower.toFixed(digits)} – ${bounds.upper.toFixed(digits)}]`;
}

function formatPercentBoundsRange(bounds: ParamBounds | undefined): string | null {
  if (!bounds || !Number.isFinite(bounds.lower) || !Number.isFinite(bounds.upper)) return null;
  return `[${(bounds.lower * 100).toFixed(1)}% – ${(bounds.upper * 100).toFixed(1)}%]`;
}

function chipTone(beta: number): string {
  if (beta < 0.95) return "bg-amber-100 text-amber-800 border-amber-300";
  if (beta <= 1.05) return "bg-blue-100 text-blue-800 border-blue-300";
  return "bg-emerald-100 text-emerald-800 border-emerald-300";
}

function MetricCell({ label, value, boundsText }: { label: string; value: string; boundsText?: string | null }) {
  return (
    <div className="rounded bg-gray-50 p-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold">{value}</p>
      {boundsText ? <p className="text-xs text-gray-500">{boundsText}</p> : null}
    </div>
  );
}

export default function ResultsTable({ datasets, unitsLabel }: ResultsTableProps) {
  if (datasets.length === 0) {
    return <p className="rounded border bg-white p-4 text-sm text-gray-600">Add at least one dataset to compute Weibull outputs.</p>;
  }

  const anyBounds = datasets.some((dataset) => dataset.fit?.bounds);
  const anyApproximateBounds = datasets.some((dataset) => dataset.fit?.bounds?.approximate);

  return (
    <div className="space-y-4">
      {datasets.map((dataset) => (
        <div key={dataset.id} className={`rounded border bg-white p-4 shadow-sm ${dataset.visible ? "" : "opacity-70"}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: dataset.colorKey }} />
              <h3 className="text-base font-semibold">{dataset.name}</h3>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{dataset.fit?.method ?? "N/A"}</span>
            </div>
            {!dataset.visible ? <span className="text-xs text-gray-500">Hidden on plot</span> : null}
          </div>

          {dataset.error ? <p className="mb-2 text-sm text-red-700">{dataset.error}</p> : null}

          {dataset.fit ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span className={`rounded border px-2 py-1 text-xs font-medium ${chipTone(dataset.fit.beta)}`}>
                  {classifyBeta(dataset.fit.beta)}
                </span>
                <span className="text-xs text-gray-600">
                  n={dataset.fit.nTotal} (FAIL {dataset.fit.nFail}, SUSP {dataset.fit.nSusp})
                </span>
              </div>

              <p className="mb-3 text-sm text-gray-800">{interpretFit(dataset.fit, unitsLabel)}</p>

              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                <MetricCell label="beta" value={formatMetric(dataset.fit.beta)} boundsText={formatBoundsRange(dataset.fit.bounds?.beta)} />
                <MetricCell
                  label={`eta (${unitsLabel})`}
                  value={formatMetric(dataset.fit.eta)}
                  boundsText={formatBoundsRange(dataset.fit.bounds?.eta)}
                />
                <MetricCell
                  label={`B1 (${unitsLabel})`}
                  value={formatMetric(dataset.fit.b1)}
                  boundsText={formatBoundsRange(dataset.fit.bounds?.b1)}
                />
                <MetricCell
                  label={`B10 (${unitsLabel})`}
                  value={formatMetric(dataset.fit.b10)}
                  boundsText={formatBoundsRange(dataset.fit.bounds?.b10)}
                />
                <MetricCell
                  label={`B50 (${unitsLabel})`}
                  value={formatMetric(dataset.fit.b50)}
                  boundsText={formatBoundsRange(dataset.fit.bounds?.b50)}
                />
                <MetricCell label={`B63.2 = eta (${unitsLabel})`} value={formatMetric(dataset.fit.b632)} />
                <MetricCell label={`MTTF (${unitsLabel})`} value={formatMetric(dataset.fit.mttf)} />
                <MetricCell
                  label="R(t mission)"
                  value={dataset.fit.rMission !== undefined ? `${(dataset.fit.rMission * 100).toFixed(3)}%` : "N/A"}
                  boundsText={formatPercentBoundsRange(dataset.fit.bounds?.rMission)}
                />
                <MetricCell
                  label="F(t mission)"
                  value={dataset.fit.fMission !== undefined ? `${(dataset.fit.fMission * 100).toFixed(3)}%` : "N/A"}
                />
              </div>

              {dataset.fit.r2 !== undefined ? (
                <p className="mt-3 text-xs text-gray-700">
                  Plot Linearity (R^2): <span className="font-semibold">{formatMetric(dataset.fit.r2, 5)}</span>
                </p>
              ) : null}
            </>
          ) : null}

          {dataset.warnings.length > 0 ? (
            <div className="mt-3 rounded border-l-4 border-amber-500 bg-amber-50 p-2 text-xs text-amber-800">
              {dataset.warnings.map((warning) => (
                <p key={`${dataset.id}-${warning}`}>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      ))}

      {anyBounds ? (
        <p className="text-xs text-gray-500">
          Fisher-matrix two-sided bounds at the selected confidence level.
          {anyApproximateBounds ? " Bounds for regression fits are approximate (evaluated at the regression point estimate)." : ""}
        </p>
      ) : null}
    </div>
  );
}
