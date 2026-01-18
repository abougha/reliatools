// app/tools/Derating/ResultsSummary.tsx
"use client";

import { useMemo, useState } from "react";
import type { DeratingNavigatorState, Status } from "@/lib/derating/models";

export type SummaryRow = {
  id: string;
  refDes: string;
  type: string;
  match: "Exact" | "Fallback" | "None";
  effectiveRuleId: string;
  parameter: string;
  status: Status;
  limiting: string;
};

type Props = {
  state: DeratingNavigatorState;
  rows: SummaryRow[];
  onRowClick: (componentId: string) => void;
};

function statusBadge(status: Status) {
  const cls =
    status === "Pass"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Fail"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function fmtPct(x?: number) {
  if (x === undefined || x === null || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(1)}%`;
}

function fmtNum(x?: number | null, digits = 2) {
  if (x === undefined || x === null || !Number.isFinite(x)) return "—";
  return Number(x).toFixed(digits);
}

export function ResultsSummary({ state, rows, onRowClick }: Props) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");

  const worstId = state.overall.worst?.componentId ?? null;
  const worstComp = worstId ? state.components.find((c) => c.id === worstId) : undefined;

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return rows.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (!qq) return true;

      const hay = `${r.refDes} ${r.type} ${r.effectiveRuleId} ${r.parameter} ${r.limiting} ${r.match}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, q, statusFilter]);

  return (
    <div className="mb-6 space-y-4">
      {/* Overall */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Overall Summary</div>
            <div className="mt-1 text-xs text-neutral-600">
              Worst-case rollup across all components (derated DM/FOS + temp margin where applicable).
            </div>
          </div>
          <div>{statusBadge(state.overall.status)}</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm lg:grid-cols-4">
          <div className="rounded-lg border bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Worst Component</div>
            <div className="mt-1 font-medium">
              {worstComp ? `${worstComp.refDes} (${worstComp.componentType})` : "—"}
            </div>
          </div>

          <div className="rounded-lg border bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Limiting Check</div>
            <div className="mt-1 font-medium">{state.overall.worst?.limitingCheckKey ?? "—"}</div>
          </div>

          <div className="rounded-lg border bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Min Derated DM</div>
            <div className="mt-1 font-medium">{fmtPct(state.overall.worst?.minDeratedDM)}</div>
          </div>

          <div className="rounded-lg border bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Min Derated FOS</div>
            <div className="mt-1 font-medium">{fmtNum(state.overall.worst?.minDeratedFOS, 2)}</div>
          </div>
        </div>

        <div className="mt-3 text-xs text-neutral-600">
          Targets: derated DM ≥ <span className="font-medium">{fmtPct(state.targets.minDeratedDM)}</span>, derated FOS ≥{" "}
          <span className="font-medium">{fmtNum(state.targets.minDeratedFOS, 2)}</span>, temp margin ≥{" "}
          <span className="font-medium">{fmtNum(state.targets.minTempMarginC, 0)}°C</span>
        </div>
      </div>

      {/* Component Summary */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium">Component Summary</div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="w-[260px] rounded-lg border px-3 py-2 text-sm"
              placeholder="Search refdes, type, rule, limiting…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="All">All</option>
              <option value="Pass">Pass</option>
              <option value="Attention">Attention</option>
              <option value="Fail">Fail</option>
            </select>

            <div className="text-xs text-neutral-500">
              {filtered.length}/{rows.length}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border bg-neutral-50 p-4 text-sm text-neutral-600">
            No components yet. Add one to see results here.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border bg-neutral-50 p-4 text-sm text-neutral-600">
            No matches for your filter/search.
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-600">
                <tr>
                  <th className="px-3 py-2">RefDes</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Rule</th>
                  <th className="px-3 py-2">Match</th>
                  <th className="px-3 py-2">Parameter</th>
                  <th className="px-3 py-2">Limiting</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((r) => {
                  const isWorst = !!worstId && r.id === worstId;

                  return (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onRowClick(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onRowClick(r.id);
                      }}
                      className={[
                        "cursor-pointer hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-black/10",
                        isWorst ? "bg-amber-50/40" : "",
                      ].join(" ")}
                      title="Click to open this component"
                    >
                      <td className="px-3 py-2 font-medium">{r.refDes}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2">{r.effectiveRuleId}</td>
                      <td className="px-3 py-2">{r.match}</td>
                      <td className="px-3 py-2">{r.parameter}</td>
                      <td className="px-3 py-2">{r.limiting}</td>
                      <td className="px-3 py-2">{statusBadge(r.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Optional: Detailed worst metrics (if present) */}
      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm font-medium">Worst Metrics (from rollup)</div>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm lg:grid-cols-3">
          <div className="rounded-lg border bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Min Derated DM</div>
            <div className="mt-1 font-medium">{fmtPct(state.overall.worst?.minDeratedDM)}</div>
          </div>
          <div className="rounded-lg border bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Min Derated FOS</div>
            <div className="mt-1 font-medium">{fmtNum(state.overall.worst?.minDeratedFOS, 2)}</div>
          </div>
          <div className="rounded-lg border bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Min Temp Margin</div>
            <div className="mt-1 font-medium">
              {state.overall.worst?.minTempMarginC !== undefined
                ? `${fmtNum(state.overall.worst?.minTempMarginC, 0)}°C`
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
