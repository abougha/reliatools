"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ContactCTA from "@/components/ContactCTA";
import {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  classifyLevel,
  dominantDimensions,
  hasCriticalDimension,
  itemTotal,
  summarize,
  type NuddDimensionKey,
  type NuddItem,
  type NuddLevel,
} from "@/lib/nudd";

const DIMENSION_FIELD: Record<
  NuddDimensionKey,
  "newScore" | "uniqueScore" | "differentScore" | "difficultScore"
> = {
  new: "newScore",
  unique: "uniqueScore",
  different: "differentScore",
  difficult: "difficultScore",
};

const QUESTIONS: Record<NuddDimensionKey, string[]> = {
  new: [
    "Has this technology or function been used in our products before?",
    "Is it proven in the intended environment and application?",
  ],
  unique: [
    "Is this solution specific to this design, customer, or use case?",
    "Are comparable references, benchmarks, standards, or field data limited?",
  ],
  different: [
    "Does it depart from the current architecture, design practice, material, supplier, or process?",
    "Could it introduce unfamiliar interfaces, interactions, loads, or failure modes?",
  ],
  difficult: [
    "Does it require unresolved technical learning or a breakthrough?",
    "Will design, verification, manufacturing, integration, or scaling be unusually challenging?",
  ],
};

const TABLE_COLUMN_COUNT = 6;

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `nudd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createItem(): NuddItem {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: "",
    newScore: null,
    uniqueScore: null,
    differentScore: null,
    difficultScore: null,
    justification: "",
    createdDate: now,
    updatedDate: now,
  };
}

/**
 * Dimensions the user never selected stay null (honest "not tagged" state).
 * For scoring, a touched item backfills its untagged dimensions to 0 so the
 * unmodified lib/nudd.ts sum/threshold logic (which requires all four rated)
 * still applies unchanged.
 */
function engagedItem(item: NuddItem): NuddItem {
  const touched = DIMENSION_KEYS.some((dim) => item[DIMENSION_FIELD[dim]] !== null);
  if (!touched) return item;
  return {
    ...item,
    newScore: item.newScore ?? 0,
    uniqueScore: item.uniqueScore ?? 0,
    differentScore: item.differentScore ?? 0,
    difficultScore: item.difficultScore ?? 0,
  };
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes("\n") || v.includes('"')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function levelBadgeClasses(level: NuddLevel): string {
  if (level === "Low") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (level === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-orange-300 bg-orange-50 text-orange-700";
}

function LevelBadge({ level }: { level: NuddLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${levelBadgeClasses(
        level
      )}`}
    >
      {level}
    </span>
  );
}

function CriticalBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
      ⚠ High dimension
    </span>
  );
}

function DimensionChip({
  dimension,
  value,
  onToggle,
  onSetSeverity,
}: {
  dimension: NuddDimensionKey;
  value: number | null;
  onToggle: () => void;
  onSetSeverity: (v: number) => void;
}) {
  const active = value !== null;
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-1">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`rounded px-2 py-1 text-xs font-medium transition ${
          active
            ? "bg-blue-600 text-white"
            : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
        }`}
      >
        {DIMENSION_LABELS[dimension]}
      </button>
      {active ? (
        <div role="radiogroup" aria-label={`${DIMENSION_LABELS[dimension]} severity`} className="flex gap-0.5">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              onClick={() => onSetSeverity(n)}
              className={`h-6 w-6 rounded text-[11px] font-semibold transition ${
                value === n
                  ? "bg-gray-800 text-white"
                  : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildCsv(items: NuddItem[]): string {
  const engaged = items.map(engagedItem);
  const summary = summarize(engaged);
  const header = [
    "Feature or Function",
    "New",
    "Unique",
    "Different",
    "Difficult",
    "Total (/12)",
    "Level",
    "Critical Dimension (Y/N)",
    "Justification",
  ];

  const rows = engaged.map((it) => {
    const total = itemTotal(it);
    const level = total !== null ? classifyLevel(total) : "";
    return [
      it.name,
      it.newScore ?? "",
      it.uniqueScore ?? "",
      it.differentScore ?? "",
      it.difficultScore ?? "",
      total ?? "",
      level,
      hasCriticalDimension(it) ? "Y" : "N",
      it.justification,
    ]
      .map((v) => csvEscape(String(v)))
      .join(",");
  });

  const lines = [header.join(","), ...rows];
  lines.push("");
  lines.push(`${csvEscape("Overall average (/12)")},${csvEscape(summary.average !== null ? summary.average.toFixed(1) : "")}`);
  lines.push(`${csvEscape("Overall level")},${csvEscape(summary.overallLevel ?? "")}`);
  lines.push(`${csvEscape("Assessed items")},${csvEscape(String(summary.completedCount))}`);
  lines.push(`${csvEscape("High items")},${csvEscape(String(summary.highCount))}`);
  lines.push(`${csvEscape("Items with critical dimension")},${csvEscape(String(summary.criticalCount))}`);

  return lines.join("\n");
}

export default function NuddAssessmentPage() {
  const [items, setItems] = useState<NuddItem[]>([]);

  const summary = useMemo(() => summarize(items.map(engagedItem)), [items]);

  const highestItemEff = useMemo(() => {
    if (!summary.highestItemId) return null;
    const raw = items.find((it) => it.id === summary.highestItemId);
    return raw ? engagedItem(raw) : null;
  }, [items, summary.highestItemId]);

  const dominantLabels = highestItemEff
    ? dominantDimensions(highestItemEff).map((d) => DIMENSION_LABELS[d])
    : [];

  function updateItem(id: string, patch: Partial<NuddItem>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedDate: new Date().toISOString() } : it))
    );
  }

  function toggleDimension(id: string, dimension: NuddDimensionKey) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const field = DIMENSION_FIELD[dimension];
        const isActive = it[field] !== null;
        return { ...it, [field]: isActive ? null : 0, updatedDate: new Date().toISOString() };
      })
    );
  }

  function setDimensionScore(id: string, dimension: NuddDimensionKey, value: number) {
    updateItem(id, { [DIMENSION_FIELD[dimension]]: value } as Partial<NuddItem>);
  }

  function handleAddItem() {
    setItems((prev) => [...prev, createItem()]);
  }

  function handleDuplicate(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      if (idx === -1) return prev;
      const src = prev[idx];
      const now = new Date().toISOString();
      const copy: NuddItem = {
        ...src,
        id: generateId(),
        name: src.name.trim() ? `${src.name} (Copy)` : "",
        createdDate: now,
        updatedDate: now,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this feature or function? This cannot be undone.")) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function handleClearAll() {
    if (items.length === 0) return;
    if (!window.confirm("Clear all features and functions? This cannot be undone.")) return;
    setItems([]);
  }

  function handleCalculate() {
    document.getElementById("nudd-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDownloadCsv() {
    const csv = buildCsv(items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nudd-assessment.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">NUDD Assessment</h1>
      <p className="mt-2 text-gray-600">
        Score what is New, Unique, Different, and Difficult — then focus engineering effort where
        uncertainty and opportunity are highest.
      </p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 print:hidden">
        Select which dimensions apply to a feature, then set each one&apos;s severity:{" "}
        <strong>0</strong> = None &middot; <strong>1</strong> = Low &middot; <strong>2</strong> = Moderate &middot;{" "}
        <strong>3</strong> = High
      </div>

      {/* Feature & Function table */}
      <section className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-800">Feature &amp; Function</h2>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={handleAddItem}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Add Feature or Function
            </button>
            <button
              type="button"
              onClick={handleCalculate}
              className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Calculate NUDD
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="border-b px-3 py-2 text-left w-44">Feature or Function</th>
                <th className="border-b px-3 py-2 text-left w-80">Dimensions</th>
                <th className="border-b px-3 py-2 text-left w-24">NUDD Score</th>
                <th className="border-b px-3 py-2 text-left w-40">NUDD Level</th>
                <th className="border-b px-3 py-2 text-left">Justification or Evidence</th>
                <th className="border-b px-3 py-2 text-left w-28 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLUMN_COUNT} className="border-b px-3 py-6 text-center text-sm text-gray-500">
                    No features or functions yet. Click &ldquo;+ Add Feature or Function&rdquo; above to begin.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const eff = engagedItem(item);
                  const total = itemTotal(eff);
                  const level = total !== null ? classifyLevel(total) : null;
                  const critical = hasCriticalDimension(eff);
                  const needsJustification = level !== null && level !== "Low" && !item.justification.trim();

                  return (
                    <tr key={item.id}>
                      <td className="border-b px-3 py-2 align-top">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                          placeholder="e.g., Predictive thermal control"
                          className="w-full rounded-md border px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="border-b px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {DIMENSION_KEYS.map((dim) => (
                            <DimensionChip
                              key={dim}
                              dimension={dim}
                              value={item[DIMENSION_FIELD[dim]]}
                              onToggle={() => toggleDimension(item.id, dim)}
                              onSetSeverity={(v) => setDimensionScore(item.id, dim, v)}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="border-b px-3 py-2 align-top font-mono text-sm">
                        {total !== null ? `${total} / 12` : <span className="text-gray-400">Not assessed</span>}
                      </td>
                      <td className="border-b px-3 py-2 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {level ? <LevelBadge level={level} /> : <span className="text-xs text-gray-400">—</span>}
                          {critical ? <CriticalBadge /> : null}
                        </div>
                      </td>
                      <td className="border-b px-3 py-2 align-top">
                        <textarea
                          value={item.justification}
                          onChange={(e) => updateItem(item.id, { justification: e.target.value })}
                          rows={2}
                          placeholder="Optional for Low; required for Medium/High"
                          className={`w-full rounded-md border px-2 py-1 text-xs ${
                            needsJustification ? "border-amber-400" : ""
                          }`}
                        />
                        {needsJustification ? (
                          <p className="mt-1 text-[11px] text-amber-700">
                            Justification required for Medium/High to count toward the summary.
                          </p>
                        ) : null}
                      </td>
                      <td className="border-b px-3 py-2 align-top print:hidden">
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleDuplicate(item.id)}
                            className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-100"
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* NUDD Question Matrix — static reference guide */}
      <section className="mt-6 rounded-xl border bg-white p-4 shadow-sm print:hidden">
        <h2 className="text-xl font-semibold text-gray-800">NUDD Question Matrix</h2>
        <p className="mt-1 text-sm text-gray-600">
          Reference guide. In the table above, select which dimensions apply to a feature, then set each
          one&apos;s severity from 0 (none) to 3 (high).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {DIMENSION_KEYS.map((dim) => (
            <div key={dim} className="rounded-lg border bg-gray-50 p-3">
              <h3 className="mb-2 font-semibold text-gray-800">{DIMENSION_LABELS[dim]}</h3>
              <ul className="list-disc space-y-1 pl-5 text-xs text-gray-600">
                {QUESTIONS[dim].map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Assessment Summary */}
      <section id="nudd-summary" className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800">Assessment Summary</h2>

        {summary.completedCount === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No completed assessments yet.
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Highest-scoring item</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-800">{highestItemEff?.name || "Untitled feature or function"}</span>
                <span className="font-mono text-sm">{summary.highestItemTotal} / 12</span>
                {summary.highestItemTotal !== null ? (
                  <LevelBadge level={classifyLevel(summary.highestItemTotal)} />
                ) : null}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Dominant dimension{dominantLabels.length > 1 ? "s" : ""}: {dominantLabels.join(", ")}
              </div>
              {summary.difficultIsDominantInHighest ? (
                <p className="mt-2 rounded border-l-4 border-blue-400 bg-blue-50 p-2 text-xs text-blue-800">
                  Difficult is the dominant dimension. This is where focused learning may create a technical
                  and market advantage.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">High items</div>
                <div className="mt-1 text-2xl font-semibold text-gray-800">{summary.highCount}</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Items with critical dimension</div>
                <div className="mt-1 text-2xl font-semibold text-gray-800">{summary.criticalCount}</div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Low / Medium / High scale</div>
              <div className="flex h-3 overflow-hidden rounded-full border">
                <div className="flex-1 bg-emerald-200" title="Low" />
                <div className="flex-1 bg-amber-200" title="Medium" />
                <div className="flex-1 bg-orange-300" title="High" />
              </div>
            </div>

            <div className="border-t pt-3 text-sm text-gray-500">
              Average across {summary.completedCount} assessed item{summary.completedCount === 1 ? "" : "s"}:{" "}
              <span className="font-mono">{summary.average !== null ? summary.average.toFixed(1) : "—"} / 12</span>
              {summary.overallLevel ? (
                <span className="ml-2">
                  <LevelBadge level={summary.overallLevel} />
                </span>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {/* Export / Print + session notice */}
      <section className="mt-6 rounded-xl border bg-white p-4 shadow-sm print:hidden">
        <h2 className="text-xl font-semibold text-gray-800">Export</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Print
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          This assessment is held in your browser for this session only and is not saved. Export or print
          before leaving or refreshing.
        </p>
      </section>

      <ContactCTA variant="tool" />

      <section className="mt-12 border-t pt-8 text-sm text-gray-600 print:hidden">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">How to use this</h2>
        <p className="mb-4">
          Run this assessment during concept selection, design reviews, or DRBFM/change-point discussions to
          decide where DFMEA and test-strategy effort should concentrate. For each feature or function,
          select which NUDD dimensions apply, then rate each selected dimension&apos;s severity from 0 to 3 in
          the table; use the question matrix below it as a guide. Dimensions left unselected count as 0.
          Items scored Medium or High require a documented justification or evidence gap; Low items do not.
        </p>
        <p className="mb-4">
          <strong>Example:</strong>{" "}
          a feature that introduces a new sensor architecture with limited field data and an unresolved
          integration question will score High and surface at the top of the summary &mdash; even if most
          other features in the same product are Low or Medium.
        </p>
        <p>
          Related reading:{" "}
          {/* Unresolved: no NUDD article exists yet in data/resources.json. Placeholder route below. */}
          <Link href="/resources/nudd" className="text-blue-600 hover:underline">
            What is a NUDD assessment?
          </Link>
        </p>
      </section>
    </div>
  );
}
