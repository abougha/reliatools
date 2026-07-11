"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import ContactCTA from "@/components/ContactCTA";
import {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  classifyLevel,
  dominantDimensions,
  hasCriticalDimension,
  isRated,
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

function ScoreControl({
  dimension,
  value,
  onChange,
}: {
  dimension: NuddDimensionKey;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label={`${DIMENSION_LABELS[dimension]} score`} className="flex gap-1.5">
      {[0, 1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-md border text-sm font-semibold transition ${
            value === n
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function applyDisabledReason(item: NuddItem | null): string | null {
  if (!item) return null;
  if (!item.name.trim()) return "Add a feature or function name before applying a score.";
  if (!isRated(item)) return "Rate all four dimensions (New, Unique, Different, Difficult) before applying.";
  const total = itemTotal(item);
  if (total !== null) {
    const level = classifyLevel(total);
    if (level !== "Low" && !item.justification.trim()) {
      return "Medium and High items require justification before applying.";
    }
  }
  return null;
}

function buildCsv(items: NuddItem[]): string {
  const summary = summarize(items);
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

  const rows = items.map((it) => {
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<NuddItem | null>(null);

  const matrixRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const nameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedItem = useMemo(
    () => (selectedId ? items.find((it) => it.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  const summary = useMemo(() => summarize(items), [items]);

  const highestItem = useMemo(
    () => (summary.highestItemId ? items.find((it) => it.id === summary.highestItemId) ?? null : null),
    [items, summary.highestItemId]
  );

  const dominantLabels = highestItem
    ? dominantDimensions(highestItem).map((d) => DIMENSION_LABELS[d])
    : [];

  function updateItem(id: string, patch: Partial<NuddItem>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedDate: new Date().toISOString() } : it))
    );
  }

  function handleAddItem() {
    setItems((prev) => [...prev, createItem()]);
  }

  function handleAssess(id: string) {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    setSelectedId(id);
    setSnapshot({ ...item });
    requestAnimationFrame(() => {
      matrixRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleEditFocus(id: string) {
    const input = nameInputRefs.current[id];
    input?.focus();
    input?.select();
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
    if (selectedId === id) {
      setSelectedId(null);
      setSnapshot(null);
    }
  }

  function handleClearAll() {
    if (items.length === 0) return;
    if (!window.confirm("Clear all features and functions? This cannot be undone.")) return;
    setItems([]);
    setSelectedId(null);
    setSnapshot(null);
  }

  function handleCalculate() {
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setDimensionScore(dimension: NuddDimensionKey, value: number) {
    if (!selectedId) return;
    updateItem(selectedId, { [DIMENSION_FIELD[dimension]]: value } as Partial<NuddItem>);
  }

  const applyReason = applyDisabledReason(selectedItem);
  const applyDisabled = applyReason !== null;

  function handleApplyScore() {
    if (applyDisabled) return;
    setSelectedId(null);
    setSnapshot(null);
  }

  function handleCancelMatrix() {
    if (selectedId && snapshot) {
      setItems((prev) => prev.map((it) => (it.id === selectedId ? (snapshot as NuddItem) : it)));
    }
    setSelectedId(null);
    setSnapshot(null);
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

  const provisionalTotal = selectedItem ? itemTotal(selectedItem) : null;
  const provisionalLevel = provisionalTotal !== null ? classifyLevel(provisionalTotal) : null;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">NUDD Assessment</h1>
      <p className="mt-2 text-gray-600">
        Score what is New, Unique, Different, and Difficult — then focus engineering effort where
        uncertainty and opportunity are highest.
      </p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 print:hidden">
        Score each dimension: <strong>0</strong> = None &middot; <strong>1</strong> = Low &middot;{" "}
        <strong>2</strong> = Moderate &middot; <strong>3</strong> = High
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

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No features or functions yet. Add one to begin scoring.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="border-b px-3 py-2 text-left w-56">Feature or Function</th>
                  <th className="border-b px-3 py-2 text-left w-24">NUDD Score</th>
                  <th className="border-b px-3 py-2 text-left w-48">NUDD Level</th>
                  <th className="border-b px-3 py-2 text-left">Justification or Evidence</th>
                  <th className="border-b px-3 py-2 text-left w-52 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const rated = isRated(item);
                  const total = itemTotal(item);
                  const level = total !== null ? classifyLevel(total) : null;
                  const critical = hasCriticalDimension(item);
                  const active = item.id === selectedId;

                  return (
                    <tr key={item.id} className={active ? "bg-blue-50" : undefined}>
                      <td className="border-b px-3 py-2 align-top">
                        <input
                          ref={(el) => {
                            nameInputRefs.current[item.id] = el;
                          }}
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                          placeholder="e.g., Predictive thermal control"
                          className="w-full rounded-md border px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="border-b px-3 py-2 align-top font-mono text-sm">
                        {rated ? `${total} / 12` : <span className="text-gray-400">Not assessed</span>}
                      </td>
                      <td className="border-b px-3 py-2 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {rated && level ? <LevelBadge level={level} /> : <span className="text-xs text-gray-400">—</span>}
                          {rated && critical ? <CriticalBadge /> : null}
                        </div>
                      </td>
                      <td className="border-b px-3 py-2 align-top">
                        <textarea
                          value={item.justification}
                          onChange={(e) => updateItem(item.id, { justification: e.target.value })}
                          rows={2}
                          placeholder="Optional for Low; required for Medium/High"
                          className="w-full rounded-md border px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="border-b px-3 py-2 align-top print:hidden">
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleAssess(item.id)}
                            className="rounded border border-blue-300 bg-blue-50 px-2 py-1 font-medium text-blue-700 hover:bg-blue-100"
                          >
                            Assess
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditFocus(item.id)}
                            className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-100"
                          >
                            Edit
                          </button>
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* NUDD Question Matrix */}
      {selectedItem ? (
        <section
          ref={matrixRef}
          className="mt-6 rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4 shadow-sm print:hidden"
        >
          <h2 className="text-xl font-semibold text-gray-800">NUDD Question Matrix</h2>
          <p className="mt-1 text-sm text-gray-600">
            Selected item: <strong>{selectedItem.name.trim() || "Untitled feature or function"}</strong>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Consider each question, then rate the dimension from 0 (none) to 3 (high).
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {DIMENSION_KEYS.map((dim) => (
              <div key={dim} className="rounded-lg border bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-800">{DIMENSION_LABELS[dim]}</h3>
                  <ScoreControl
                    dimension={dim}
                    value={selectedItem[DIMENSION_FIELD[dim]]}
                    onChange={(v) => setDimensionScore(dim, v)}
                  />
                </div>
                <ul className="list-disc space-y-1 pl-5 text-xs text-gray-600">
                  {QUESTIONS[dim].map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3">
            <span className="text-sm text-gray-600">Provisional total:</span>
            <span className="font-mono text-lg font-semibold">
              {provisionalTotal !== null ? `${provisionalTotal} / 12` : "— / 12"}
            </span>
            {provisionalLevel ? <LevelBadge level={provisionalLevel} /> : null}
            {hasCriticalDimension(selectedItem) ? <CriticalBadge /> : null}
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Justification / Evidence</span>
            <textarea
              value={selectedItem.justification}
              onChange={(e) => updateItem(selectedItem.id, { justification: e.target.value })}
              placeholder="Explain why the item received this score and identify the available evidence or remaining gap."
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </label>

          {applyReason ? <p className="mt-2 text-xs text-amber-700">{applyReason}</p> : null}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={applyDisabled}
              onClick={handleApplyScore}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Apply Score
            </button>
            <button
              type="button"
              onClick={handleCancelMatrix}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {/* Assessment Summary */}
      <section ref={summaryRef} className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
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
                <span className="font-semibold text-gray-800">{highestItem?.name || "Untitled feature or function"}</span>
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
          decide where DFMEA and test-strategy effort should concentrate. Rate each feature or function
          against all four NUDD dimensions using the guiding questions in the matrix, then apply the score.
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
