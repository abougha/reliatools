"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { BlockMath } from "react-katex";

// Palette per DESIGN.md: slate neutrals (never gray), Signal Blue as the only
// accent, amber/red strictly semantic. Calculated output renders flat with a
// left-border strip; only interactive surfaces get a shadow.

export function NumberField({
  label,
  ariaLabel,
  value,
  onChange,
  error,
  hint,
  disabled,
}: {
  /** Omit when the caller renders its own label (e.g. alongside a radio); pass ariaLabel instead. */
  label?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const input = (
    <input
      className={`mt-1 w-full rounded-lg border p-2 ${error ? "border-red-500" : "border-slate-200"} ${
        disabled ? "bg-slate-50 text-slate-500" : "text-slate-900"
      }`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      inputMode="decimal"
      aria-label={label ? undefined : ariaLabel}
    />
  );

  return (
    <div>
      {label ? (
        <label className="block text-sm font-medium text-slate-900">
          {label}
          {input}
        </label>
      ) : (
        input
      )}
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      {!error && hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function MethodSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Method">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            value === option.id
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Formula({ math, legend }: { math: string; legend?: ReactNode }) {
  return (
    <section className="mb-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
      <div className="overflow-x-auto text-center">
        <BlockMath math={math} />
      </div>
      {legend ? <p className="mt-1 text-xs text-slate-600">{legend}</p> : null}
    </section>
  );
}

export function CalculateButton({ onClick, label = "Calculate" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      {label}
    </button>
  );
}

export function SecondaryButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex gap-2 rounded-sm border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-sm border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</div>
  );
}

/**
 * Persistent scope note at the head of a tab — "this is a planner, not a
 * calculator", "HALT proves nothing". Distinct from Warning: it is always
 * visible context rather than a conditional response to the inputs.
 */
export function ScopeNote({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 rounded-sm border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {children}
    </div>
  );
}

const VERDICT_TONES = {
  pass: "border-blue-600 bg-blue-50 text-blue-900",
  fail: "border-red-500 bg-red-50 text-red-700",
  caution: "border-amber-500 bg-amber-50 text-amber-800",
} as const;

/** Pass/fail or assessment callout rendered inside a result. */
export function Verdict({
  tone,
  title,
  children,
}: {
  tone: keyof typeof VERDICT_TONES;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-sm border-l-4 px-4 py-3 text-sm ${VERDICT_TONES[tone]}`}>
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

/**
 * Every result in this tool renders through here, because every result has to
 * carry its method and its assumptions. Stating what the number does not mean is
 * the point of the tool, so the shape of the panel enforces it rather than
 * leaving it to whoever writes the next tab.
 *
 * The callout itself stays flat (DESIGN.md: calculated output is an instrument
 * readout, not an object). Charts and tables sit below it on the page rather
 * than inside the tinted strip.
 */
export function ResultPanel({
  headline,
  detail,
  method,
  assumptions,
  children,
}: {
  headline: string;
  detail?: ReactNode;
  method: string;
  assumptions: string[];
  children?: ReactNode;
}) {
  return (
    <>
      <div className="mt-6 rounded-sm border-l-4 border-blue-600 bg-blue-50 p-4">
        <div className="flex items-start gap-2">
          <CheckCircle className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <p className="text-lg font-semibold text-blue-700">{headline}</p>
            {detail ? <div className="mt-1 text-sm text-blue-900">{detail}</div> : null}
          </div>
        </div>

        <div className="mt-4 border-t border-blue-200 pt-3 text-sm text-blue-900">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
            <span>
              <strong className="font-semibold">Method:</strong> {method}
            </span>
          </p>
          <p className="mt-3 font-semibold">This number assumes:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      </div>

      {children ? <div className="mt-6">{children}</div> : null}
    </>
  );
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.setAttribute("hidden", "");
  anchor.setAttribute("href", url);
  anchor.setAttribute("download", filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
