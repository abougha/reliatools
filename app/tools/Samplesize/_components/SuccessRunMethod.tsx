"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  binomialAcceptanceProbability,
  confidenceFromAcceptance,
  solveReliabilityFromBinomial,
  solveSampleSizeForConfidence,
} from "@/lib/reliabilityMath";
import {
  CalculateButton,
  ErrorNote,
  Formula,
  NumberField,
  ResultPanel,
  SecondaryButton,
  Warning,
  downloadCsv,
} from "./ui";

type SolveTarget = "n" | "R" | "CL";

const DEFAULTS = {
  failures: "0",
  confidence: "95",
  reliability: "90",
  sampleSize: "30",
  solveFor: "n" as SolveTarget,
};

/**
 * The original Samplesize binomial engine, unchanged in behaviour: solve for n, R
 * or CL, the confidence-vs-n chart, and the CSV export with its original filename
 * and header. Only the surrounding chrome moved.
 */
export default function SuccessRunMethod() {
  const [failures, setFailures] = useState(DEFAULTS.failures);
  const [confidence, setConfidence] = useState(DEFAULTS.confidence);
  const [reliability, setReliability] = useState(DEFAULTS.reliability);
  const [sampleSize, setSampleSize] = useState(DEFAULTS.sampleSize);
  const [solveFor, setSolveFor] = useState<SolveTarget>(DEFAULTS.solveFor);

  const [result, setResult] = useState<{ headline: string; detail: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [chartData, setChartData] = useState<Array<{ n: number; cl: number }>>([]);

  const parsed = useMemo(
    () => ({
      f: Number(failures),
      clPct: Number(confidence),
      rPct: Number(reliability),
      n: Number(sampleSize),
    }),
    [failures, confidence, reliability, sampleSize]
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"f" | "CL" | "R" | "n", string>> = {};

    if (!Number.isInteger(parsed.f) || parsed.f < 0) {
      errors.f = "Failures must be a non-negative integer.";
    }
    if (!Number.isFinite(parsed.clPct) || parsed.clPct <= 0 || parsed.clPct >= 100) {
      errors.CL = "Confidence must be between 0 and 100 (exclusive).";
    }
    if (!Number.isFinite(parsed.rPct) || parsed.rPct <= 0 || parsed.rPct >= 100) {
      errors.R = "Reliability must be between 0 and 100 (exclusive).";
    }
    if (!Number.isInteger(parsed.n) || parsed.n <= 0) {
      errors.n = "Sample size must be a positive integer.";
    }
    if (Number.isInteger(parsed.f) && Number.isInteger(parsed.n) && parsed.f >= parsed.n && solveFor !== "n") {
      errors.n = "Sample size n must be greater than failures f.";
    }
    return errors;
  }, [parsed, solveFor]);

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  const buildChart = (from: number, to: number, f: number, r: number) => {
    const data: Array<{ n: number; cl: number }> = [];
    for (let nVal = Math.max(f + 1, from); nVal <= to; nVal += 1) {
      const acceptance = binomialAcceptanceProbability(nVal, f, r);
      data.push({ n: nVal, cl: Number((confidenceFromAcceptance(acceptance) * 100).toFixed(3)) });
    }
    return data;
  };

  const handleCalculate = () => {
    setResult(null);
    setErrorMessage("");
    setWarning("");

    if (hasFieldErrors) {
      setErrorMessage("Please fix the input validation errors above.");
      setChartData([]);
      return;
    }

    const f = parsed.f;
    const inputR = parsed.rPct / 100;
    const inputCL = parsed.clPct / 100;
    const inputN = parsed.n;

    try {
      if (solveFor === "n") {
        const solved = solveSampleSizeForConfidence(f, inputR, inputCL);
        setSampleSize(String(solved.n));
        setResult({
          headline: `Required sample size: ${solved.n} units`,
          detail: `Exact solution n = ${solved.nReal.toFixed(4)}, rounded up. Testing ${solved.n} units with at most ${f} failure${
            f === 1 ? "" : "s"
          } demonstrates R = ${parsed.rPct}% at ${parsed.clPct}% confidence.`,
        });
        setChartData(buildChart(solved.n - 10, solved.n + 10, f, inputR));
        return;
      }

      if (solveFor === "R") {
        if (f >= inputN) {
          setErrorMessage("No solution: n must be greater than f.");
          setChartData([]);
          return;
        }
        const solvedR = solveReliabilityFromBinomial(inputN, f, inputCL);
        setReliability((solvedR * 100).toFixed(4));
        setResult({
          headline: `Minimum reliability: ${(solvedR * 100).toFixed(4)}%`,
          detail: `That is the most ${inputN} units with ${f} failure${f === 1 ? "" : "s"} can demonstrate at ${
            parsed.clPct
          }% confidence.`,
        });

        const acceptanceAtRoot = binomialAcceptanceProbability(inputN, f, solvedR);
        if (Math.abs(acceptanceAtRoot - (1 - inputCL)) > 1e-6) {
          setWarning("Solver residual is above 1e-6; verify assumptions.");
        }
        setChartData(buildChart(inputN - 10, inputN + 10, f, solvedR));
        return;
      }

      if (f >= inputN) {
        setErrorMessage("No solution: n must be greater than f.");
        setChartData([]);
        return;
      }
      const acceptance = binomialAcceptanceProbability(inputN, f, inputR);
      const solvedCl = confidenceFromAcceptance(acceptance);
      setConfidence((solvedCl * 100).toFixed(4));
      setResult({
        headline: `Achieved confidence level: ${(solvedCl * 100).toFixed(4)}%`,
        detail: `Testing ${inputN} units with ${f} failure${f === 1 ? "" : "s"} supports R = ${parsed.rPct}% at that confidence.`,
      });
      setChartData(buildChart(inputN - 10, inputN + 10, f, inputR));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Calculation failed.");
      setChartData([]);
    }
  };

  const resetInputs = () => {
    setFailures(DEFAULTS.failures);
    setConfidence(DEFAULTS.confidence);
    setReliability(DEFAULTS.reliability);
    setSampleSize(DEFAULTS.sampleSize);
    setSolveFor(DEFAULTS.solveFor);
    setResult(null);
    setChartData([]);
    setErrorMessage("");
    setWarning("");
  };

  const fields = [
    { id: "f" as const, label: "Failures (f)", value: failures, onChange: setFailures, target: null },
    { id: "CL" as const, label: "Confidence level (%)", value: confidence, onChange: setConfidence, target: "CL" as const },
    { id: "R" as const, label: "Reliability (%)", value: reliability, onChange: setReliability, target: "R" as const },
    { id: "n" as const, label: "Sample size (n)", value: sampleSize, onChange: setSampleSize, target: "n" as const },
  ];

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        The classic reliability demonstration. Test n units, allow at most f failures, and read off what that proves.
        Pick which quantity to solve for; the other three are inputs.
      </p>

      <Formula
        math={"\\sum_{i=0}^{f} \\binom{n}{i}(1-R)^i R^{\\,n-i} = 1-CL"}
        legend={
          <>
            <strong>n</strong> = sample size, <strong>f</strong> = allowed failures, <strong>R</strong> = reliability,{" "}
            <strong>CL</strong> = confidence level. At f = 0 this reduces to n = ln(1&minus;CL) / ln(R).
          </>
        }
      />

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium text-slate-800">Solve for</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                {field.target ? (
                  <input
                    type="radio"
                    name="successRunSolveFor"
                    value={field.target}
                    checked={solveFor === field.target}
                    onChange={() => setSolveFor(field.target)}
                  />
                ) : (
                  <span className="inline-block w-[13px]" aria-hidden="true" />
                )}
                {field.label}
              </label>
              <NumberField
                ariaLabel={field.label}
                value={field.value}
                onChange={field.onChange}
                error={fieldErrors[field.id]}
                disabled={field.target !== null && solveFor === field.target}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <CalculateButton onClick={handleCalculate} />
        <SecondaryButton onClick={resetInputs} label="Reset" />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}
      {warning ? <Warning>{warning}</Warning> : null}

      {result ? (
        <ResultPanel
          headline={result.headline}
          detail={result.detail}
          method="Binomial (attribute) acceptance sampling — the exact discrete form, not a Poisson approximation."
          assumptions={[
            "Every unit is a pass/fail trial with the same reliability — no unit-to-unit variation in the underlying R.",
            "Units are tested to the full mission life or bogey. Testing shorter proves less; testing longer is the extended bogey method.",
            "Failures are independent and attributable to the same population.",
            "This is a demonstration, not an estimate: it bounds R from below at the stated confidence, it does not tell you the true R.",
          ]}
        >
          {chartData.length > 0 ? (
            <>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Confidence vs sample size</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="n" label={{ value: "Sample size (n)", position: "insideBottom", offset: -12 }} />
                  <YAxis label={{ value: "Confidence (%)", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cl" stroke="#1d4ed8" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3">
                <SecondaryButton
                  label="Download CSV"
                  onClick={() =>
                    downloadCsv("confidence_vs_sample_size.csv", [
                      ["Sample Size", "Confidence Level (%)"],
                      ...chartData.map((row) => [String(row.n), String(row.cl)]),
                    ])
                  }
                />
              </div>
            </>
          ) : null}
        </ResultPanel>
      ) : null}
    </div>
  );
}
