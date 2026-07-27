"use client";

import { useEffect, useMemo, useState } from "react";
import ContactCTA from "@/components/ContactCTA";
import {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  actionPriority,
  classifyLevel,
  dominantDimensions,
  hasCriticalDimension,
  isAssessed,
  isEvidenceComplete,
  itemTotal,
  suggestedResponse,
  summarize,
  type NuddActionPriority,
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

const TABLE_COLUMN_COUNT = 8;
const NUDD_STORAGE_KEY = "reliatools.nudd.v1";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `nudd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createItem(): NuddItem {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: "",
    newScore: 0,
    uniqueScore: 0,
    differentScore: 0,
    difficultScore: 0,
    justification: "",
    createdDate: now,
    updatedDate: now,
  };
}

function loadStoredItems(): NuddItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NUDD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as NuddItem[];
  } catch {
    return null;
  }
}

function saveStoredItems(items: NuddItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NUDD_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage failures to keep UX smooth.
  }
}

function clearStoredItems() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(NUDD_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
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

function priorityBadgeClasses(priority: NuddActionPriority): string {
  if (priority === "Standard") return "border-gray-200 bg-gray-50 text-gray-700";
  if (priority === "Focused") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-300 bg-red-50 text-red-700";
}

function PriorityBadge({ priority }: { priority: NuddActionPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${priorityBadgeClasses(
        priority
      )}`}
    >
      {priority}
    </span>
  );
}

/** "No NUDD exposure identified yet" at 0/12, "Balanced exposure" on a tie, else the single dominant dimension. */
function dominantDimensionLine(item: NuddItem): string {
  if (itemTotal(item) === 0) return "No NUDD exposure identified yet.";
  const dominants = dominantDimensions(item);
  if (dominants.length > 1) return "Balanced exposure across dimensions";
  return `Dominant dimension: ${DIMENSION_LABELS[dominants[0]]}`;
}

function criticalDimensionLabel(item: NuddItem): string | null {
  const criticalDims = DIMENSION_KEYS.filter((dim) => item[DIMENSION_FIELD[dim]] === 3);
  if (criticalDims.length === 0) return null;
  return criticalDims.map((dim) => `${DIMENSION_LABELS[dim]} = 3`).join(", ");
}

function DimensionHelp({ dimension }: { dimension: NuddDimensionKey }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${DIMENSION_LABELS[dimension]} guidance`}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] leading-none text-gray-500 hover:bg-gray-100"
      >
        ?
      </button>
      {open ? (
        <div className="absolute left-0 top-5 z-10 w-56 rounded-md border border-gray-200 bg-white p-2 text-[11px] text-gray-600 shadow-lg">
          <ul className="list-disc space-y-1 pl-4">
            {QUESTIONS[dimension].map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </span>
  );
}

function DimensionScoreGrid({
  item,
  onSetScore,
}: {
  item: NuddItem;
  onSetScore: (dimension: NuddDimensionKey, value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      {DIMENSION_KEYS.map((dim) => (
        <div key={dim} className="flex items-center gap-2">
          <span className="flex w-[4.5rem] shrink-0 items-center gap-1 text-xs font-medium text-gray-700">
            {DIMENSION_LABELS[dim]}
            <DimensionHelp dimension={dim} />
          </span>
          <div role="radiogroup" aria-label={`${DIMENSION_LABELS[dim]} score`} className="flex gap-1">
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={item[DIMENSION_FIELD[dim]] === n}
                onClick={() => onSetScore(dim, n)}
                className={`h-6 w-6 rounded text-[11px] font-semibold transition ${
                  item[DIMENSION_FIELD[dim]] === n
                    ? "bg-gray-800 text-white"
                    : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExposureSummary({ item }: { item: NuddItem }) {
  const level = classifyLevel(itemTotal(item));
  const criticalLabel = criticalDimensionLabel(item);
  return (
    <p className="text-xs text-gray-700">
      Total exposure: <span className="font-semibold">{level}</span>
      {criticalLabel ? <> &middot; Critical dimension: {criticalLabel}</> : null}
    </p>
  );
}

function NameField({ item, onChange }: { item: NuddItem; onChange: (v: string) => void }) {
  const touched =
    DIMENSION_KEYS.some((dim) => item[DIMENSION_FIELD[dim]] !== 0) || item.justification.trim().length > 0;
  const showHint = !item.name.trim() && touched;
  return (
    <div>
      <input
        type="text"
        value={item.name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Predictive thermal control"
        className="w-full rounded-md border px-2 py-1 text-sm"
      />
      {showHint ? <p className="mt-1 text-[11px] text-amber-700">Name this item to include it in the summary.</p> : null}
    </div>
  );
}

function EvidenceField({ item, onChange }: { item: NuddItem; onChange: (v: string) => void }) {
  const complete = isEvidenceComplete(item);
  return (
    <div>
      <textarea
        value={item.justification}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="What evidence exists, and what remains unknown?"
        className={`w-full rounded-md border px-2 py-1 text-xs ${complete ? "" : "border-amber-400"}`}
      />
      {!complete ? (
        <p className="mt-1 text-[11px] text-amber-700">Evidence needed for Medium/High or Elevated-priority items.</p>
      ) : null}
    </div>
  );
}

function ItemActions({
  onDuplicate,
  onDelete,
}: {
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      <button
        type="button"
        onClick={onDuplicate}
        className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-100"
      >
        Duplicate
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}

function buildCsv(items: NuddItem[]): string {
  const assessed = items.filter(isAssessed);
  const summary = summarize(items);
  const header = [
    "Feature or Function",
    "New",
    "Unique",
    "Different",
    "Difficult",
    "Total (/12)",
    "Level",
    "Priority",
    "Suggested Response",
    "Critical Dimension (Y/N)",
    "Evidence / Gap",
  ];

  const rows = assessed.map((it) => {
    const total = itemTotal(it);
    return [
      it.name,
      it.newScore,
      it.uniqueScore,
      it.differentScore,
      it.difficultScore,
      total,
      classifyLevel(total),
      actionPriority(it),
      suggestedResponse(it),
      hasCriticalDimension(it) ? "Y" : "N",
      it.justification,
    ]
      .map((v) => csvEscape(String(v)))
      .join(",");
  });

  const lines = [header.join(","), ...rows, ""];
  lines.push(`${csvEscape("Assessed items")},${csvEscape(String(summary.assessedCount))}`);
  lines.push(`${csvEscape("Low")},${csvEscape(String(summary.lowCount))}`);
  lines.push(`${csvEscape("Medium")},${csvEscape(String(summary.mediumCount))}`);
  lines.push(`${csvEscape("High")},${csvEscape(String(summary.highCount))}`);
  lines.push(`${csvEscape("Elevated priority")},${csvEscape(String(summary.elevatedCount))}`);
  lines.push(`${csvEscape("Evidence incomplete")},${csvEscape(String(summary.evidenceIncompleteCount))}`);
  lines.push("");
  lines.push(csvEscape("Top items by total"));
  summary.topItems.forEach((it, idx) => {
    lines.push(`${csvEscape(`${idx + 1}. ${it.name}`)},${csvEscape(`${itemTotal(it)} / 12`)}`);
  });

  return lines.join("\n");
}

export default function NuddAssessmentPage() {
  const [items, setItems] = useState<NuddItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredItems();
    setItems(stored && stored.length > 0 ? stored : [createItem()]);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStoredItems(items);
  }, [items, hydrated]);

  const summary = useMemo(() => summarize(items), [items]);

  function updateItem(id: string, patch: Partial<NuddItem>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedDate: new Date().toISOString() } : it))
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

  function handleClearSaved() {
    if (items.length === 0) return;
    if (!window.confirm("Clear all saved features and functions? This cannot be undone.")) return;
    clearStoredItems();
    setReviewNotice(null);
    setItems([createItem()]);
  }

  function handleReviewAssessment() {
    const missingEvidence = summary.evidenceIncompleteCount;
    setReviewNotice(
      missingEvidence > 0
        ? `${missingEvidence} item${missingEvidence === 1 ? "" : "s"} missing required evidence.`
        : null
    );
    document.getElementById("nudd-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDownloadCsv() {
    const csv = buildCsv(items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nudd-assessment.csv";
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 0);
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">NUDD Assessment</h1>
      <p className="mt-2 text-base font-medium text-gray-800">
        NUDD identifies where deeper risk analysis and validation are needed. It complements &mdash; but
        does not replace &mdash; DFMEA, DRBFM or technical risk assessment.
      </p>
      <p className="mt-2 text-gray-600">
        Score what is New, Unique, Different, and Difficult &mdash; then focus engineering effort where
        uncertainty and opportunity are highest.
      </p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 print:hidden">
        Rate each dimension from <strong>0</strong> (none) to <strong>3</strong> (high). All dimensions
        start at 0 &mdash; one click per dimension, four clicks per feature.
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
              onClick={handleReviewAssessment}
              className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Review Assessment
            </button>
            <button
              type="button"
              onClick={handleClearSaved}
              className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Clear saved data
            </button>
          </div>
        </div>

        {/* Table — sm and up */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="border-b px-3 py-2 text-left">Feature or Function</th>
                <th className="border-b px-3 py-2 text-left">Dimensions</th>
                <th className="border-b px-3 py-2 text-left">Score</th>
                <th className="border-b px-3 py-2 text-left">Total Exposure</th>
                <th className="border-b px-3 py-2 text-left">Priority</th>
                <th className="border-b px-3 py-2 text-left">Suggested Response</th>
                <th className="border-b px-3 py-2 text-left">Evidence / Gap</th>
                <th className="border-b px-3 py-2 text-left print:hidden">Actions</th>
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
                  const priority = actionPriority(item);
                  return (
                    <tr key={item.id}>
                      <td className="border-b px-3 py-2 align-top">
                        <NameField item={item} onChange={(v) => updateItem(item.id, { name: v })} />
                      </td>
                      <td className="border-b px-3 py-2 align-top">
                        <DimensionScoreGrid
                          item={item}
                          onSetScore={(dim, v) => setDimensionScore(item.id, dim, v)}
                        />
                      </td>
                      <td className="border-b px-3 py-2 align-top font-mono text-sm">
                        {itemTotal(item)} / 12
                      </td>
                      <td className="border-b px-3 py-2 align-top">
                        <ExposureSummary item={item} />
                      </td>
                      <td className="border-b px-3 py-2 align-top">
                        <PriorityBadge priority={priority} />
                      </td>
                      <td className="border-b px-3 py-2 align-top text-xs text-gray-700">
                        {suggestedResponse(item)}
                      </td>
                      <td className="border-b px-3 py-2 align-top">
                        <EvidenceField item={item} onChange={(v) => updateItem(item.id, { justification: v })} />
                      </td>
                      <td className="border-b px-3 py-2 align-top print:hidden">
                        <ItemActions
                          onDuplicate={() => handleDuplicate(item.id)}
                          onDelete={() => handleDelete(item.id)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cards — below sm */}
        <div className="space-y-3 sm:hidden">
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              No features or functions yet. Tap &ldquo;+ Add Feature or Function&rdquo; above to begin.
            </p>
          ) : (
            items.map((item) => {
              const priority = actionPriority(item);
              return (
                <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                  <NameField item={item} onChange={(v) => updateItem(item.id, { name: v })} />
                  <div className="mt-3">
                    <DimensionScoreGrid
                      item={item}
                      onSetScore={(dim, v) => setDimensionScore(item.id, dim, v)}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">{itemTotal(item)} / 12</span>
                    <PriorityBadge priority={priority} />
                  </div>
                  <div className="mt-2">
                    <ExposureSummary item={item} />
                  </div>
                  <p className="mt-2 text-xs text-gray-700">{suggestedResponse(item)}</p>
                  <div className="mt-3">
                    <EvidenceField item={item} onChange={(v) => updateItem(item.id, { justification: v })} />
                  </div>
                  <div className="mt-3">
                    <ItemActions
                      onDuplicate={() => handleDuplicate(item.id)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* NUDD Question Matrix — static reference guide, collapsible but always in the DOM for crawlers */}
      <section className="mt-6 rounded-xl border bg-white p-4 shadow-sm print:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xl font-semibold text-gray-800">
            NUDD Question Matrix
            <span className="text-sm text-gray-400 transition-transform group-open:rotate-180">&#9662;</span>
          </summary>
          <p className="mt-1 text-sm text-gray-600">
            Reference guide. In the table above, rate each dimension&apos;s severity from 0 (none) to 3
            (high).
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
        </details>
      </section>

      {/* Assessment Summary */}
      <section id="nudd-summary" className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800">Assessment Summary</h2>

        {reviewNotice ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {reviewNotice}
          </div>
        ) : null}

        {summary.assessedCount === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No features assessed yet. Name a feature or function above to include it here.
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Low</div>
                <div className="mt-1 text-2xl font-semibold text-gray-800">{summary.lowCount}</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Medium</div>
                <div className="mt-1 text-2xl font-semibold text-gray-800">{summary.mediumCount}</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">High</div>
                <div className="mt-1 text-2xl font-semibold text-gray-800">{summary.highCount}</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Elevated priority</div>
                <div className="mt-1 text-2xl font-semibold text-gray-800">{summary.elevatedCount}</div>
              </div>
            </div>

            {summary.evidenceIncompleteCount > 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {summary.evidenceIncompleteCount} item{summary.evidenceIncompleteCount === 1 ? "" : "s"} missing
                required evidence.
              </div>
            ) : null}

            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                Top {summary.topItems.length === 1 ? "item" : "items"} by total exposure
              </div>
              <div className="space-y-2">
                {summary.topItems.map((item, idx) => {
                  const total = itemTotal(item);
                  const level = classifyLevel(total);
                  const priority = actionPriority(item);
                  return (
                    <div key={item.id} className="rounded-lg border bg-gray-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                        <span className="font-semibold text-gray-800">
                          {item.name || "Untitled feature or function"}
                        </span>
                        <span className="font-mono text-sm">{total} / 12</span>
                        <LevelBadge level={level} />
                        <PriorityBadge priority={priority} />
                      </div>
                      <div className="mt-1 text-xs text-gray-600">{dominantDimensionLine(item)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-3 text-sm text-gray-500">
              Assessed items: <span className="font-semibold text-gray-700">{summary.assessedCount}</span>
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
          Saved locally in this browser only &mdash; never uploaded. Use &ldquo;Clear saved data&rdquo; to
          remove it, or export/print for a permanent record.
        </p>
      </section>

      <ContactCTA variant="tool" />

      <section className="mt-12 border-t pt-8 text-sm text-gray-600 print:hidden">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">How to use this</h2>
        <p className="mb-4">
          Run this assessment during concept selection, design reviews, or DRBFM/change-point discussions to
          decide where DFMEA and test-strategy effort should concentrate. For each feature or function, rate
          all four NUDD dimensions from 0 to 3 in the table; use the question matrix above as a guide. Items
          scored Medium, High, or flagged Elevated priority need a documented Evidence / Gap entry to be
          marked complete &mdash; but every named item, complete or not, counts toward the summary below.
        </p>
        <p>
          <strong>Example:</strong>{" "}
          a feature that introduces a new sensor architecture with limited field data and an unresolved
          integration question will score High and surface in the top items &mdash; even if most other
          features in the same product are Low or Medium.
        </p>
      </section>
    </div>
  );
}
