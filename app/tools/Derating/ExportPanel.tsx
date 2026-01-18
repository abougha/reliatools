"use client";

import { useMemo, useState } from "react";
import type { DeratingNavigatorState } from "@/lib/derating/models";

type Props = {
  state: DeratingNavigatorState;
};

function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

function fmtPct01(x: number | undefined | null): string {
  if (x === undefined || x === null || !Number.isFinite(x)) return "";
  return (x * 100).toFixed(2);
}

function fmtNum(x: number | undefined | null, digits = 3): string {
  if (x === undefined || x === null || !Number.isFinite(x)) return "";
  return Number(x).toFixed(digits);
}

export function ExportPanel({ state }: Props) {
  const [copied, setCopied] = useState(false);

  const jsonString = useMemo(() => JSON.stringify(state, null, 2), [state]);

  const componentCsvRows = useMemo(() => {
    return state.components.map((c) => {
      const match = c.rule.matchedRuleId ? "Exact" : c.rule.effectiveRuleId ? "Fallback" : "None";
      const ruleId = c.rule.effectiveRuleId ?? c.rule.matchedRuleId ?? "";
      const parameter = c.results?.parameterDerated ?? c.rule.effectiveRule?.parameterDerated ?? "";
      const status = c.results?.status ?? "Attention";
      const limiting = c.results?.worst?.limitingCheckKey ?? "";
      const dm = c.results?.worst?.minDeratedDM;
      const fos = c.results?.worst?.minDeratedFOS ?? null;
      const tMargin = c.results?.worst?.minTempMarginC;

      return {
        RefDes: c.refDes,
        ComponentType: c.componentType,
        Match: match,
        EffectiveRuleId: ruleId,
        Parameter: parameter,
        Status: status,
        LimitingCheck: limiting,
        MinDeratedDM_percent: fmtPct01(dm),
        MinDeratedFOS: fmtNum(fos, 3),
        MinTempMarginC: tMargin ?? "",
        MessageCount: c.results?.messages?.length ?? 0,
        Notes: c.notes ?? "",
      };
    });
  }, [state.components]);

  const rulesUsedCsvRows = useMemo(() => {
    return state.components.map((c) => {
      const er = c.rule.effectiveRule;
      return {
        RefDes: c.refDes,
        ComponentType: c.componentType,
        EffectiveRuleId: c.rule.effectiveRuleId ?? c.rule.matchedRuleId ?? "",
        ParameterDerated: er?.parameterDerated ?? "",
        ApplicationCategory: er?.applicationCategory ?? "",
        QualityClass: er?.qualityClass ?? "",
        DeratingFactor: er?.deratingFactor ?? "",
        MaxOperatingLimitExpr: er?.maxOperatingLimitExpr ?? "",
        TypicalFailureMode: er?.typicalFailureMode ?? "",
        Source: er?.source ?? "",
      };
    });
  }, [state.components]);

  const overallCsvRows = useMemo(() => {
    const w = state.overall.worst;
    return [
      {
        OverallStatus: state.overall.status,
        WorstComponentId: w?.componentId ?? "",
        WorstRefDes: w?.refDes ?? "",
        WorstLimitingCheck: w?.limitingCheckKey ?? "",
        WorstMinDeratedDM_percent: fmtPct01(w?.minDeratedDM),
        WorstMinDeratedFOS: fmtNum(w?.minDeratedFOS ?? null, 3),
        WorstMinTempMarginC: w?.minTempMarginC ?? "",
        TargetMinDeratedDM_percent: fmtPct01(state.targets.minDeratedDM),
        TargetMinDeratedFOS: fmtNum(state.targets.minDeratedFOS, 3),
        TargetMinTempMarginC: state.targets.minTempMarginC,
        RequireExactRuleMatch: state.settings.requireExactRuleMatch ? "true" : "false",
        ApplicationCategory: state.settings.applicationCategory,
        QualityClass: state.settings.qualityClass,
      },
    ];
  }, [state]);

  async function onCopyJson() {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  function baseName() {
    return (state.meta.projectName || "derating").trim().replace(/\s+/g, "_");
  }

  function onDownloadJson() {
    downloadText(`${baseName()}_state.json`, jsonString, "application/json;charset=utf-8");
  }

  function onDownloadComponentsCsv() {
    downloadText(`${baseName()}_components.csv`, toCsv(componentCsvRows), "text/csv;charset=utf-8");
  }

  function onDownloadOverallCsv() {
    downloadText(`${baseName()}_overall.csv`, toCsv(overallCsvRows), "text/csv;charset=utf-8");
  }

  function onDownloadRulesUsedCsv() {
    downloadText(`${baseName()}_rules_used.csv`, toCsv(rulesUsedCsvRows), "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Export</div>
            <div className="mt-1 text-sm text-neutral-600">
              Download rollups for reviews, design records, or sharing with suppliers.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-neutral-50"
              onClick={onDownloadOverallCsv}
            >
              Download Overall CSV
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-neutral-50"
              onClick={onDownloadComponentsCsv}
            >
              Download Components CSV
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-neutral-50"
              onClick={onDownloadRulesUsedCsv}
            >
              Download Rules Used CSV
            </button>
            <button
              className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:opacity-90"
              onClick={onDownloadJson}
            >
              Download JSON
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm font-medium">State JSON</div>
          <button className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-neutral-50" onClick={onCopyJson}>
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>

        <textarea
          className="h-[420px] w-full rounded-lg border bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed"
          value={jsonString}
          readOnly
        />
        <div className="mt-2 text-xs text-neutral-500">JSON is full-fidelity (rules, inputs, results, overall).</div>
      </div>
    </div>
  );
}
