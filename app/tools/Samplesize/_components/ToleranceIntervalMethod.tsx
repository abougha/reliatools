"use client";

import { useMemo, useState } from "react";
import {
  solveSampleSizeForConfidence,
  toleranceFactorOneSided,
  toleranceFactorTwoSided,
} from "@/lib/reliabilityMath";
import { CalculateButton, ErrorNote, Formula, NumberField, ResultPanel, Verdict, Warning } from "./ui";

type Sided = "upper" | "lower" | "two";

interface Verdict {
  label: string;
  bound: number;
  limit: number;
  pass: boolean;
}

interface Result {
  k: number;
  n: number;
  coveragePct: number;
  confidencePct: number;
  sided: Sided;
  attributeN: number;
  verdicts: Verdict[];
  marginRatio: number | null;
}

export default function ToleranceIntervalMethod() {
  const [coverage, setCoverage] = useState("90");
  const [confidence, setConfidence] = useState("90");
  const [sampleSize, setSampleSize] = useState("10");
  const [sided, setSided] = useState<Sided>("upper");
  const [mean, setMean] = useState("");
  const [sd, setSd] = useState("");
  const [usl, setUsl] = useState("");
  const [lsl, setLsl] = useState("");

  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const parsed = useMemo(
    () => ({
      pPct: Number(coverage),
      cPct: Number(confidence),
      n: Number(sampleSize),
      mean: mean.trim() === "" ? null : Number(mean),
      sd: sd.trim() === "" ? null : Number(sd),
      usl: usl.trim() === "" ? null : Number(usl),
      lsl: lsl.trim() === "" ? null : Number(lsl),
    }),
    [coverage, confidence, sampleSize, mean, sd, usl, lsl]
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"P" | "C" | "n" | "mean" | "sd" | "usl" | "lsl", string>> = {};
    if (!Number.isFinite(parsed.pPct) || parsed.pPct <= 0 || parsed.pPct >= 100) {
      errors.P = "Coverage must be between 0 and 100 (exclusive).";
    }
    if (!Number.isFinite(parsed.cPct) || parsed.cPct <= 0 || parsed.cPct >= 100) {
      errors.C = "Confidence must be between 0 and 100 (exclusive).";
    }
    if (!Number.isInteger(parsed.n) || parsed.n < 2) {
      errors.n = "Sample size must be a whole number of at least 2.";
    }
    if (parsed.mean !== null && !Number.isFinite(parsed.mean)) errors.mean = "Mean must be a number.";
    if (parsed.sd !== null && (!Number.isFinite(parsed.sd) || parsed.sd <= 0)) {
      errors.sd = "Standard deviation must be greater than 0.";
    }
    if (parsed.usl !== null && !Number.isFinite(parsed.usl)) errors.usl = "USL must be a number.";
    if (parsed.lsl !== null && !Number.isFinite(parsed.lsl)) errors.lsl = "LSL must be a number.";
    return errors;
  }, [parsed]);

  const handleCalculate = () => {
    setResult(null);
    setErrorMessage("");
    if (Object.keys(fieldErrors).length > 0) {
      setErrorMessage("Please fix the input validation errors above.");
      return;
    }

    try {
      const p = parsed.pPct / 100;
      const c = parsed.cPct / 100;
      const k = sided === "two" ? toleranceFactorTwoSided(parsed.n, p, c) : toleranceFactorOneSided(parsed.n, p, c);

      const verdicts: Verdict[] = [];
      let marginRatio: number | null = null;

      if (parsed.mean !== null && parsed.sd !== null && parsed.sd > 0) {
        if ((sided === "upper" || sided === "two") && parsed.usl !== null) {
          const bound = parsed.mean + k * parsed.sd;
          verdicts.push({ label: "x̄ + k·s ≤ USL", bound, limit: parsed.usl, pass: bound <= parsed.usl });
          marginRatio = (parsed.usl - parsed.mean) / parsed.sd;
        }
        if ((sided === "lower" || sided === "two") && parsed.lsl !== null) {
          const bound = parsed.mean - k * parsed.sd;
          verdicts.push({ label: "x̄ − k·s ≥ LSL", bound, limit: parsed.lsl, pass: bound >= parsed.lsl });
          const lowerMargin = (parsed.mean - parsed.lsl) / parsed.sd;
          marginRatio = marginRatio === null ? lowerMargin : Math.min(marginRatio, lowerMargin);
        }
      }

      setResult({
        k,
        n: parsed.n,
        coveragePct: parsed.pPct,
        confidencePct: parsed.cPct,
        sided,
        attributeN: solveSampleSizeForConfidence(0, p, c).n,
        verdicts,
        marginRatio,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Calculation failed.");
    }
  };

  const allPass = result !== null && result.verdicts.length > 0 && result.verdicts.every((entry) => entry.pass);

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        If the characteristic is a measurement rather than a pass/fail, you can prove the same claim with far fewer
        units &mdash; provided the design actually carries margin. A tolerance interval says: at least P% of the
        population sits inside this bound, with C% confidence.
      </p>

      <Formula
        math={"\\bar{x} + k \\cdot s \\le USL \\qquad k = \\frac{t'_{n-1,\\;\\delta}(C)}{\\sqrt{n}},\\; \\delta = z_P\\sqrt{n}"}
        legend={
          <>
            One-sided <strong>k</strong> is exact, from the noncentral t. The two-sided factor uses the Howe
            approximation and is accurate to about three decimals.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField label="Coverage P (%)" value={coverage} onChange={setCoverage} error={fieldErrors.P} />
        <NumberField label="Confidence C (%)" value={confidence} onChange={setConfidence} error={fieldErrors.C} />
        <NumberField label="Sample size (n)" value={sampleSize} onChange={setSampleSize} error={fieldErrors.n} />
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-900">Interval type</span>
          <div className="space-y-1">
            {(
              [
                { id: "upper", label: "One-sided, upper limit (USL)" },
                { id: "lower", label: "One-sided, lower limit (LSL)" },
                { id: "two", label: "Two-sided (both limits)" },
              ] as Array<{ id: Sided; label: string }>
            ).map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="toleranceSided"
                  checked={sided === option.id}
                  onChange={() => setSided(option.id)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <fieldset className="mt-5 rounded-lg bg-slate-50 p-4">
        <legend className="px-1 text-sm font-medium text-slate-900">Your data (optional — for a verdict)</legend>
        <p className="mb-3 text-xs text-slate-500">
          Leave blank to get the k-factor alone. Fill in to test a specific result against its limit.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField label="Sample mean (x̄)" value={mean} onChange={setMean} error={fieldErrors.mean} />
          <NumberField label="Sample std dev (s)" value={sd} onChange={setSd} error={fieldErrors.sd} />
          {sided !== "lower" ? (
            <NumberField label="Upper spec limit (USL)" value={usl} onChange={setUsl} error={fieldErrors.usl} />
          ) : null}
          {sided !== "upper" ? (
            <NumberField label="Lower spec limit (LSL)" value={lsl} onChange={setLsl} error={fieldErrors.lsl} />
          ) : null}
        </div>
      </fieldset>

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {result && result.marginRatio !== null && result.marginRatio < result.k ? (
        <Warning>
          <strong>The margin is not there.</strong> Your limit sits {result.marginRatio.toFixed(2)}·s from the mean,
          but this method needs at least {result.k.toFixed(2)}·s at n = {result.n}. The variables route only saves
          units when the design has room; a part running close to its limit gets no discount, and you are back to
          counting failures.
        </Warning>
      ) : null}

      {result ? (
        <ResultPanel
          headline={`k = ${result.k.toFixed(4)}`}
          detail={
            <>
              At n = {result.n}, {result.coveragePct}/{result.confidencePct}{" "}
              {result.sided === "two" ? "two-sided" : "one-sided"}. The same claim by the attribute route
              (pass/fail, zero failures) would take <strong>{result.attributeN} units</strong> — this needs{" "}
              <strong>{result.n}</strong>, but only if the design carries {result.k.toFixed(2)}·s of margin. The
              saving is real and it is conditional.
            </>
          }
          method={
            result.sided === "two"
              ? "Two-sided tolerance interval, Howe approximation (approximate by construction)."
              : "One-sided tolerance interval, exact noncentral-t factor."
          }
          assumptions={[
            "The characteristic is normally distributed. This is the load-bearing assumption — check it with a normal probability plot before trusting the number, because a skewed distribution makes k meaningless.",
            "x̄ and s come from the same population you are making the claim about, measured under the conditions the claim covers.",
            "Measurement error is small relative to s. If gauge variation is a large share of your spread, you are partly characterising the gauge.",
            "The claim is about the population proportion inside the limit, not about a failure rate over time. It says nothing about how the characteristic drifts with age.",
            result.sided === "two"
              ? "The Howe approximation is used for the two-sided factor, accurate to roughly three decimal places — adequate for planning, not for a formal submission requiring exact factors."
              : "The one-sided factor is exact (noncentral t), not a table interpolation.",
          ]}
        >
          {result.verdicts.length > 0 ? (
            <Verdict tone={allPass ? "pass" : "fail"} title={allPass ? "Passes" : "Does not pass"}>
              <ul className="space-y-1">
                {result.verdicts.map((entry) => (
                  <li key={entry.label}>
                    {entry.label}: {entry.bound.toFixed(4)} vs {entry.limit.toFixed(4)} —{" "}
                    <strong>{entry.pass ? "pass" : "fail"}</strong>
                  </li>
                ))}
              </ul>
            </Verdict>
          ) : null}
        </ResultPanel>
      ) : null}
    </div>
  );
}
