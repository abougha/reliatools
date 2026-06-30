"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import { Calculator, CheckCircle } from "lucide-react";
import {
  binomialAcceptanceProbability,
  confidenceFromAcceptance,
  solveReliabilityFromBinomial,
  solveSampleSizeForConfidence,
} from "@/lib/reliabilityMath";

type SolveTarget = "n" | "R" | "CL";

const DEFAULTS = {
  failures: "0",
  confidence: "95",
  reliability: "90",
  sampleSize: "30",
  solveFor: "n" as SolveTarget,
};

export default function SampleSizeCalculator() {
  const [failures, setFailures] = useState(DEFAULTS.failures);
  const [confidence, setConfidence] = useState(DEFAULTS.confidence);
  const [reliability, setReliability] = useState(DEFAULTS.reliability);
  const [sampleSize, setSampleSize] = useState(DEFAULTS.sampleSize);
  const [solveFor, setSolveFor] = useState<SolveTarget>(DEFAULTS.solveFor);
  const [result, setResult] = useState<string | null>(null);
  const [chartData, setChartData] = useState<Array<{ n: number; cl: number }>>([]);
  const [warning, setWarning] = useState("");

  const parsed = useMemo(() => {
    return {
      f: Number(failures),
      clPct: Number(confidence),
      rPct: Number(reliability),
      n: Number(sampleSize),
    };
  }, [failures, confidence, reliability, sampleSize]);

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

  const handleCalculate = () => {
    setResult(null);
    setWarning("");

    if (hasFieldErrors) {
      setResult("Please fix input validation errors.");
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
        setResult(`Required sample size: ${solved.n} (ceil from n_real=${solved.nReal.toFixed(4)})`);

        const data: Array<{ n: number; cl: number }> = [];
        for (let nVal = Math.max(f + 1, solved.n - 10); nVal <= solved.n + 10; nVal += 1) {
          const acceptance = binomialAcceptanceProbability(nVal, f, inputR);
          const cl = confidenceFromAcceptance(acceptance) * 100;
          data.push({ n: nVal, cl: Number(cl.toFixed(3)) });
        }
        setChartData(data);
        return;
      }

      if (solveFor === "R") {
        if (f >= inputN) {
          setResult("No solution: n must be greater than f.");
          setChartData([]);
          return;
        }

        const solvedR = solveReliabilityFromBinomial(inputN, f, inputCL);
        setReliability((solvedR * 100).toFixed(4));
        setResult(`Minimum reliability: ${(solvedR * 100).toFixed(4)}%`);

        const acceptanceAtRoot = binomialAcceptanceProbability(inputN, f, solvedR);
        const residual = Math.abs(acceptanceAtRoot - (1 - inputCL));
        if (residual > 1e-6) {
          setWarning("Solver residual is above 1e-6; verify assumptions.");
        }

        const data: Array<{ n: number; cl: number }> = [];
        for (let nVal = Math.max(f + 1, inputN - 10); nVal <= inputN + 10; nVal += 1) {
          const acceptance = binomialAcceptanceProbability(nVal, f, solvedR);
          const cl = confidenceFromAcceptance(acceptance) * 100;
          data.push({ n: nVal, cl: Number(cl.toFixed(3)) });
        }
        setChartData(data);
        return;
      }

      if (f >= inputN) {
        setResult("No solution: n must be greater than f.");
        setChartData([]);
        return;
      }

      const acceptance = binomialAcceptanceProbability(inputN, f, inputR);
      const solvedCl = confidenceFromAcceptance(acceptance);
      setConfidence((solvedCl * 100).toFixed(4));
      setResult(`Achieved confidence level: ${(solvedCl * 100).toFixed(4)}%`);

      const data: Array<{ n: number; cl: number }> = [];
      for (let nVal = Math.max(f + 1, inputN - 10); nVal <= inputN + 10; nVal += 1) {
        const acceptanceAtN = binomialAcceptanceProbability(nVal, f, inputR);
        const cl = confidenceFromAcceptance(acceptanceAtN) * 100;
        data.push({ n: nVal, cl: Number(cl.toFixed(3)) });
      }
      setChartData(data);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Calculation failed.");
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
    setWarning("");
  };

  const downloadCSV = () => {
    const rows = ["Sample Size,Confidence Level (%)"];
    chartData.forEach((row) => rows.push(`${row.n},${row.cl}`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.setAttribute("hidden", "");
    anchor.setAttribute("href", url);
    anchor.setAttribute("download", "confidence_vs_sample_size.csv");
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Calculator className="h-6 w-6 text-blue-600" />
          Sample Size Calculator (Binomial)
        </h1>
        <button
          type="button"
          onClick={resetInputs}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Reset
        </button>
      </div>

      <section className="mb-6 rounded border border-gray-200 bg-gray-100 p-4 text-sm text-gray-800">
        <h2 className="mb-2 text-base font-semibold text-blue-700">Binomial Acceptance Equation</h2>
        <div className="mb-2 text-center text-base">
          <BlockMath math={"\\sum_{i=0}^{f} \\binom{n}{i}(1-R)^i R^{n-i} = 1-CL"} />
        </div>
        <p>
          <strong>n</strong> = sample size, <strong>f</strong> = allowed failures, <strong>R</strong> = reliability,
          <strong> CL</strong> = confidence level.
        </p>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            label: "Failures (f)",
            value: failures,
            onChange: setFailures,
            id: "f" as const,
            error: fieldErrors.f,
            solvable: false,
            solveValue: null,
          },
          {
            label: "Confidence Level (%)",
            value: confidence,
            onChange: setConfidence,
            id: "CL" as const,
            error: fieldErrors.CL,
            solvable: true,
            solveValue: "CL" as const,
          },
          {
            label: "Reliability (%)",
            value: reliability,
            onChange: setReliability,
            id: "R" as const,
            error: fieldErrors.R,
            solvable: true,
            solveValue: "R" as const,
          },
          {
            label: "Sample Size (n)",
            value: sampleSize,
            onChange: setSampleSize,
            id: "n" as const,
            error: fieldErrors.n,
            solvable: true,
            solveValue: "n" as const,
          },
        ].map((field) => (
          <div key={field.id}>
            <label className="flex items-center gap-2 text-sm font-medium">
              {field.solvable ? (
                <input
                  type="radio"
                  name="solveFor"
                  value={field.solveValue ?? ""}
                  checked={field.solveValue !== null && solveFor === field.solveValue}
                  onChange={() => field.solveValue && setSolveFor(field.solveValue)}
                />
              ) : null}
              {field.label}
            </label>
            <input
              className={`mt-1 w-full rounded border p-2 ${field.error ? "border-red-500" : ""}`}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              disabled={field.solveValue !== null && solveFor === field.solveValue}
            />
            {field.error ? <p className="mt-1 text-xs text-red-700">{field.error}</p> : null}
          </div>
        ))}
      </div>

      <button onClick={handleCalculate} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        Calculate
      </button>

      {result ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded border bg-gray-50 p-4 text-center text-lg font-semibold text-green-700">
          <CheckCircle className="h-5 w-5" />
          {result}
        </div>
      ) : null}

      {warning ? (
        <div className="mt-4 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>
      ) : null}

      {chartData.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-blue-700">Confidence vs Sample Size</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="n" label={{ value: "Sample Size (n)", position: "insideBottom", offset: -5 }} />
              <YAxis label={{ value: "Confidence (%)", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Line type="monotone" dataKey="cl" stroke="#000" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
          <button onClick={downloadCSV} className="mt-4 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">
            Download CSV
          </button>
        </div>
      ) : null}

      <section className="mt-12 border-t pt-8 text-sm text-gray-600">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">How it works</h2>
        <p className="mb-4">
          For a reliability demonstration with <strong>zero allowed failures</strong> (a success-run test), the
          number of units you must test to prove a reliability R at confidence C is:
        </p>
        <BlockMath math={"n = \\frac{\\ln(1 - C)}{\\ln(R)}"} />
        <p className="mb-4">
          <strong>Example:</strong> To demonstrate <strong>R&nbsp;=&nbsp;90% at 90% confidence (R90C90)</strong>{" "}
          with no failures, you need <strong>n&nbsp;=&nbsp;ln(0.10)/ln(0.90) &asymp; 22 units</strong>.
          Demanding R99C90 instead jumps the requirement to <strong>230 units</strong> &mdash; a vivid
          illustration of how expensive high reliability targets become. The calculator also solves for
          reliability or confidence when the sample size is fixed, and handles cases that allow one or more
          failures via the binomial form.
        </p>
        <p>
          Use this early in test planning to trade sample size against confidence and reliability before
          committing lab resources. To shorten test duration instead of adding units, combine with an acceleration
          model such as{" "}
          <Link href="/tools/Arrhenius" className="text-blue-600 hover:underline">
            Arrhenius
          </Link>{" "}
          or{" "}
          <Link href="/tools/CoffinManson" className="text-blue-600 hover:underline">
            Coffin-Manson
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
