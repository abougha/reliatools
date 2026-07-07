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

const MONO = { fontFamily: "var(--font-weibull-mono)" } as const;

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

function MetricCell({ label, value, boundsText }: { label: string; value: string; boundsText?: string | null }) {
  return (
    <div className="rounded-[9px] border border-[#eef1f4] bg-[#f8fafc] p-[12px_14px]">
      <p className="text-[11px] text-[#8a929c]">{label}</p>
      <p className="text-base font-semibold text-[#1a2027]" style={MONO}>
        {value}
      </p>
      {boundsText ? (
        <p className="text-[11px] text-[#8a929c]" style={MONO}>
          {boundsText}
        </p>
      ) : null}
    </div>
  );
}

export default function ResultsTable({ datasets, unitsLabel }: ResultsTableProps) {
  if (datasets.length === 0) {
    return <p className="rounded-xl border border-[#e4e7ec] bg-white p-4 text-sm text-[#5b6470]">Add at least one dataset to compute Weibull outputs.</p>;
  }

  return (
    <div className="space-y-4">
      {datasets.map((dataset) => (
        <div
          key={dataset.id}
          className={`rounded-xl border border-[#e4e7ec] bg-white p-[20px_22px] ${dataset.visible ? "" : "opacity-70"}`}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: dataset.colorKey }} />
              <h3 className="text-base font-semibold text-[#1a2027]">{dataset.name}</h3>
              <span className="rounded bg-[#f1f5f9] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#5b6470]">
                {dataset.fit?.method ?? "N/A"}
              </span>
            </div>
            {!dataset.visible ? <span className="text-xs text-[#8a929c]">Hidden on plot</span> : null}
          </div>

          {dataset.error ? <p className="mb-2 text-sm text-red-700">{dataset.error}</p> : null}

          {dataset.fit ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#abefc6] bg-[#ecfdf3] px-2 py-1 text-xs font-medium text-[#067647]">
                  {classifyBeta(dataset.fit.beta)}
                </span>
                <span className="text-xs text-[#8a929c]" style={MONO}>
                  n={dataset.fit.nTotal} &middot; FAIL {dataset.fit.nFail} &middot; SUSP {dataset.fit.nSusp}
                </span>
              </div>

              <p className="mb-3 text-[13.5px] text-[#1a2027]" style={{ textWrap: "pretty" }}>
                {interpretFit(dataset.fit, unitsLabel)}
              </p>

              <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2 md:grid-cols-3">
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
                <p className="mt-3 text-xs text-[#5b6470]">
                  Plot linearity (R&sup2;): <span className="font-semibold text-[#1a2027]" style={MONO}>{formatMetric(dataset.fit.r2, 5)}</span>
                </p>
              ) : null}
            </>
          ) : null}

          {dataset.warnings.length > 0 ? (
            <div className="mt-3 rounded-lg border-l-[3px] border-[#f79009] bg-[#fffaeb] p-2 text-xs text-[#b54708]">
              {dataset.warnings.map((warning) => (
                <p key={`${dataset.id}-${warning}`}>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
