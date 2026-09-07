"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalculateButton, ErrorNote, NumberField, ResultPanel, ScopeNote, Warning } from "./ui";

const AXES = [
  { id: "thermal", label: "Thermal step stress (cold and hot)", note: "Steps down then up until operation stops." },
  { id: "vibration", label: "Vibration step stress", note: "Repetitive shock, stepped up in g." },
  { id: "combined", label: "Combined thermal + vibration", note: "Where interaction failures show up." },
] as const;

type AxisId = (typeof AXES)[number]["id"];

interface Line {
  label: string;
  units: number;
  detail: string;
}

interface Result {
  lines: Line[];
  total: number;
  axisCount: number;
  destructSought: boolean;
}

export default function HaltBudgetTab() {
  const [selectedAxes, setSelectedAxes] = useState<AxisId[]>(["thermal", "vibration", "combined"]);
  const [customAxes, setCustomAxes] = useState("0");
  const [unitsPerAxis, setUnitsPerAxis] = useState("1");
  const [destructSought, setDestructSought] = useState(true);
  const [spare, setSpare] = useState(true);

  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const parsed = useMemo(
    () => ({ custom: Number(customAxes), perAxis: Number(unitsPerAxis) }),
    [customAxes, unitsPerAxis]
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"custom" | "perAxis", string>> = {};
    if (!Number.isInteger(parsed.custom) || parsed.custom < 0) {
      errors.custom = "Custom axes must be a non-negative whole number.";
    }
    if (!Number.isInteger(parsed.perAxis) || parsed.perAxis < 1) {
      errors.perAxis = "Units consumed per axis must be at least 1.";
    }
    return errors;
  }, [parsed]);

  const toggleAxis = (id: AxisId) => {
    setSelectedAxes((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  const handleCalculate = () => {
    setResult(null);
    setErrorMessage("");

    const axisCount = selectedAxes.length + parsed.custom;
    if (Object.keys(fieldErrors).length > 0) {
      setErrorMessage("Please fix the input validation errors above.");
      return;
    }
    if (axisCount === 0) {
      setErrorMessage("Select at least one stress axis to explore.");
      return;
    }

    const lines: Line[] = [
      {
        label: `${axisCount} stress ${axisCount === 1 ? "axis" : "axes"} × ${parsed.perAxis} unit${
          parsed.perAxis === 1 ? "" : "s"
        }`,
        units: axisCount * parsed.perAxis,
        detail: "Units consumed finding operating limits on each axis.",
      },
    ];
    if (destructSought) {
      lines.push({
        label: `Destruct limits on ${axisCount} ${axisCount === 1 ? "axis" : "axes"}`,
        units: axisCount,
        detail: "Pushing past the operating limit to destruct costs a unit per axis, by definition.",
      });
    }
    if (spare) {
      lines.push({ label: "Spare", units: 1, detail: "One unit in reserve for a re-run after a fixturing problem." });
    }

    setResult({
      lines,
      total: lines.reduce((sum, line) => sum + line.units, 0),
      axisCount,
      destructSought,
    });
  };

  return (
    <div>
      <ScopeNote>
        <strong>HALT is discovery, not proof.</strong> It finds operating and destruct limits by stepping stress past
        specification until things break. No reliability figure, no confidence level, and no sample size in the
        statistical sense can be claimed from a HALT &mdash; not with 3 units, and not with 300. The number below is a
        budget for how many units the exploration will consume.
      </ScopeNote>

      <div className="mb-4">
        <span className="mb-2 block text-sm font-medium text-slate-900">Stress axes to explore</span>
        <div className="space-y-2">
          {AXES.map((axis) => (
            <label key={axis.id} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedAxes.includes(axis.id)}
                onChange={() => toggleAxis(axis.id)}
              />
              <span>
                {axis.label} <span className="text-slate-500">&mdash; {axis.note}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Additional custom axes"
          value={customAxes}
          onChange={setCustomAxes}
          error={fieldErrors.custom}
          hint="Power cycling, humidity, voltage margining, etc."
        />
        <NumberField
          label="Units destroyed per axis"
          value={unitsPerAxis}
          onChange={setUnitsPerAxis}
          error={fieldErrors.perAxis}
          hint="Usually 1 if survivors can be reused between axes."
        />
      </div>

      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={destructSought} onChange={() => setDestructSought((value) => !value)} />
          Push to destruct limits, not just operating limits
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={spare} onChange={() => setSpare((value) => !value)} />
          Include one spare unit
        </label>
      </div>

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} label="Budget the units" />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {result && result.total > 8 ? (
        <Warning>
          {result.total} units is a large HALT. Most programmes land between 3 and 6 because survivors get reused
          across axes until they are destroyed. If units are expensive, run the axes in sequence on the same hardware
          and only commit fresh units when something actually breaks.
        </Warning>
      ) : null}

      {!result?.destructSought && result ? (
        <Warning>
          Stopping at operating limits leaves the most valuable output of a HALT on the table. The gap between the
          operating limit and the destruct limit is the margin you actually have; without it you know where the
          product stops working but not how much room is left.
        </Warning>
      ) : null}

      {result ? (
        <ResultPanel
          headline={`${result.total} units`}
          detail={`Across ${result.axisCount} stress ${
            result.axisCount === 1 ? "axis" : "axes"
          }. HALT unit counts are driven by how much you intend to break, not by any statistical requirement.`}
          method="Unit budget arithmetic for a HALT programme. No statistical model is involved — there is none to involve."
          assumptions={[
            "No reliability, confidence or failure rate can be derived from this test. HALT tells you where the limits are, not how often the product will fail in service.",
            "Survivors are reused across axes until destroyed. If your process requires fresh units per axis, raise the per-axis figure.",
            "Every failure gets a root cause and a fix decision. A HALT that breaks units without analysis has consumed hardware and produced nothing.",
            "Limits found are for this build, this configuration, this fixture. A design change invalidates them.",
            "Fundamental limits of technology (a solder melting point, a plastic glass transition) are not design weaknesses. Stopping there is a valid result, not a failure to find one.",
          ]}
        >
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Where the units go</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <tbody>
                {result.lines.map((line) => (
                  <tr key={line.label} className="border-b border-slate-200">
                    <td className="py-2 pr-4">
                      {line.label}
                      <span className="block text-xs text-slate-500">{line.detail}</span>
                    </td>
                    <td className="py-2 text-right align-top font-medium">{line.units}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-900">Total</td>
                  <td className="py-2 text-right font-semibold">{result.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Build the actual stress profile &mdash; step sizes, dwell times, lanes &mdash; in the{" "}
            <Link href="/tools/HALTHASSWizard/" className="text-blue-600 hover:underline">
              HALT/HASS Wizard
            </Link>
            .
          </p>
        </ResultPanel>
      ) : null}
    </div>
  );
}
