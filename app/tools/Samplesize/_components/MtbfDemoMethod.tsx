"use client";

import { useMemo, useState } from "react";
import { mtbfDemonstrationTime } from "@/lib/reliabilityMath";
import { CalculateButton, ErrorNote, Formula, NumberField, ResultPanel } from "./ui";

interface MtbfResult {
  multiplier: number;
  totalTestTime: number;
  requiredMtbf: number;
  confidencePct: number;
  failures: number;
}

const formatHours = (hours: number) =>
  hours >= 1000 ? hours.toLocaleString(undefined, { maximumFractionDigits: 0 }) : hours.toFixed(1);

export default function MtbfDemoMethod() {
  const [requiredMtbf, setRequiredMtbf] = useState("5000");
  const [confidence, setConfidence] = useState("90");
  const [failures, setFailures] = useState("0");
  const [units, setUnits] = useState("10");

  const [result, setResult] = useState<MtbfResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const parsed = useMemo(
    () => ({
      mtbf: Number(requiredMtbf),
      clPct: Number(confidence),
      r: Number(failures),
      units: Number(units),
    }),
    [requiredMtbf, confidence, failures, units]
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"mtbf" | "CL" | "r" | "units", string>> = {};
    if (!Number.isFinite(parsed.mtbf) || parsed.mtbf <= 0) {
      errors.mtbf = "Required MTBF must be greater than 0.";
    }
    if (!Number.isFinite(parsed.clPct) || parsed.clPct <= 0 || parsed.clPct >= 100) {
      errors.CL = "Confidence must be between 0 and 100 (exclusive).";
    }
    if (!Number.isInteger(parsed.r) || parsed.r < 0) {
      errors.r = "Allowed failures must be a non-negative integer.";
    }
    if (!Number.isInteger(parsed.units) || parsed.units <= 0) {
      errors.units = "Units must be a positive integer.";
    }
    return errors;
  }, [parsed]);

  const handleCalculate = () => {
    setResult(null);
    setErrorMessage("");

    // The units field only splits the answer; it must not block the time budget.
    const blocking = (["mtbf", "CL", "r"] as const).some((key) => fieldErrors[key]);
    if (blocking) {
      setErrorMessage("Please fix the input validation errors above.");
      return;
    }

    try {
      const solved = mtbfDemonstrationTime(parsed.mtbf, parsed.clPct / 100, parsed.r);
      setResult({
        ...solved,
        requiredMtbf: parsed.mtbf,
        confidencePct: parsed.clPct,
        failures: parsed.r,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Calculation failed.");
    }
  };

  const hoursPerUnit =
    result && Number.isInteger(parsed.units) && parsed.units > 0 ? result.totalTestTime / parsed.units : null;

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        For repairable systems and constant failure rates, the answer is not a unit count at all — it is a{" "}
        <strong>total time budget</strong>. How you split it across units is yours to choose.
      </p>

      <Formula
        math={"T = MTBF_{req} \\cdot \\frac{\\chi^2_{1-C,\\;2r+2}}{2}"}
        legend={
          <>
            <strong>T</strong> = total accumulated test time across all units, <strong>r</strong> = failures allowed
            before the demonstration fails.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Required MTBF (hours)"
          value={requiredMtbf}
          onChange={setRequiredMtbf}
          error={fieldErrors.mtbf}
        />
        <NumberField label="Confidence C (%)" value={confidence} onChange={setConfidence} error={fieldErrors.CL} />
        <NumberField
          label="Allowed failures (r)"
          value={failures}
          onChange={setFailures}
          error={fieldErrors.r}
          hint="Allowing failures raises the time budget but makes the test survivable."
        />
      </div>

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {result ? (
        <ResultPanel
          headline={`Total test time: ${formatHours(result.totalTestTime)} unit-hours`}
          detail={`${result.requiredMtbf.toLocaleString()} h × ${result.multiplier.toFixed(4)} (the χ² multiplier at ${
            result.confidencePct
          }% confidence with r = ${result.failures}). This is a time budget, not a unit count — any combination of units and hours that accumulates it will do.`}
          method="Chi-square upper confidence bound for a time-terminated test (exponential / constant failure rate)."
          assumptions={[
            "A constant failure rate. No infant mortality, no wear-out — if either is present this number is optimistic and the Weibull methods are the right tool.",
            "The test is time-terminated (stopped at a planned time), not failure-terminated.",
            "Units are interchangeable and their hours pool freely: 10 units for 100 h is treated as identical to 1 unit for 1000 h.",
            `The demonstration fails on failure number ${result.failures + 1}. It does not license "we can have ${result.failures} failures and still ship".`,
            "Calendar time is not modelled. Accumulating the budget may need more units than the schedule allows.",
          ]}
        >
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Split the budget across units</h3>
          <div className="max-w-xs">
            <NumberField label="Units on test" value={units} onChange={setUnits} error={fieldErrors.units} />
          </div>
          {hoursPerUnit !== null ? (
            <p className="mt-3 text-sm text-slate-800">
              {parsed.units} unit{parsed.units === 1 ? "" : "s"} &rarr;{" "}
              <strong>{formatHours(hoursPerUnit)} hours per unit</strong>
              {hoursPerUnit > 8760 ? (
                <span className="text-amber-800"> — over a calendar year per unit; consider more units or acceleration.</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Enter a positive whole number of units to split the budget.</p>
          )}
        </ResultPanel>
      ) : null}
    </div>
  );
}
