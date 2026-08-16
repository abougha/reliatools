"use client";

import { useMemo, useState } from "react";
import { extendedBogeySampleSize } from "@/lib/reliabilityMath";
import { CalculateButton, ErrorNote, Formula, NumberField, ResultPanel, Warning } from "./ui";

interface BogeyResult {
  n: number;
  nReal: number;
  longerTestHelpsLittle: boolean;
  beta: number;
  lifeMultiple: number;
  reliabilityPct: number;
  confidencePct: number;
  trade: Array<{ lifeMultiple: number; n: number }>;
}

export default function ExtendedBogeyMethod() {
  const [reliability, setReliability] = useState("90");
  const [confidence, setConfidence] = useState("90");
  const [beta, setBeta] = useState("2");
  const [lifeMultiple, setLifeMultiple] = useState("2");

  const [result, setResult] = useState<BogeyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const parsed = useMemo(
    () => ({
      rPct: Number(reliability),
      clPct: Number(confidence),
      beta: Number(beta),
      lifeMultiple: Number(lifeMultiple),
    }),
    [reliability, confidence, beta, lifeMultiple]
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"R" | "CL" | "beta" | "t", string>> = {};
    if (!Number.isFinite(parsed.rPct) || parsed.rPct <= 0 || parsed.rPct >= 100) {
      errors.R = "Reliability must be between 0 and 100 (exclusive).";
    }
    if (!Number.isFinite(parsed.clPct) || parsed.clPct <= 0 || parsed.clPct >= 100) {
      errors.CL = "Confidence must be between 0 and 100 (exclusive).";
    }
    if (!Number.isFinite(parsed.beta) || parsed.beta <= 0) {
      errors.beta = "Weibull beta must be greater than 0.";
    }
    if (!Number.isFinite(parsed.lifeMultiple) || parsed.lifeMultiple <= 0) {
      errors.t = "Test duration must be greater than 0 lives.";
    }
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
      const r = parsed.rPct / 100;
      const c = parsed.clPct / 100;
      const solved = extendedBogeySampleSize(r, c, parsed.beta, parsed.lifeMultiple);
      setResult({
        ...solved,
        beta: parsed.beta,
        lifeMultiple: parsed.lifeMultiple,
        reliabilityPct: parsed.rPct,
        confidencePct: parsed.clPct,
        trade: [1, 2, 3].map((multiple) => ({
          lifeMultiple: multiple,
          n: extendedBogeySampleSize(r, c, parsed.beta, multiple).n,
        })),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Calculation failed.");
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        Trade units for time. If failures follow a Weibull with known shape &beta;, running each unit past one life
        earns extra credit, so fewer units prove the same claim. What you save depends entirely on &beta;.
      </p>

      <Formula
        math={"n = \\frac{\\ln(1-C)}{\\left(\\frac{t}{T}\\right)^{\\beta} \\ln R}"}
        legend={
          <>
            <strong>t/T</strong> = test duration as a multiple of one life, <strong>&beta;</strong> = Weibull shape.
            At t/T = 1 this is identical to the success-run result.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField label="Reliability R (%)" value={reliability} onChange={setReliability} error={fieldErrors.R} />
        <NumberField label="Confidence C (%)" value={confidence} onChange={setConfidence} error={fieldErrors.CL} />
        <NumberField
          label="Weibull shape β"
          value={beta}
          onChange={setBeta}
          error={fieldErrors.beta}
          hint="β < 1 infant mortality · β = 1 random · β > 1 wear-out"
        />
        <NumberField
          label="Test duration (t/T, multiples of one life)"
          value={lifeMultiple}
          onChange={setLifeMultiple}
          error={fieldErrors.t}
          hint="2 means each unit runs to twice the bogey."
        />
      </div>

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {result?.longerTestHelpsLittle ? (
        <Warning>
          <strong>β = {result.beta} means extending the test barely helps.</strong> At β &le; 1 failures arrive at a
          constant or decreasing rate, so time on test buys almost nothing —{" "}
          {result.beta === 1
            ? "the duration term is linear, so doubling the test only halves the units."
            : "running longer can even be counter-productive, since early life is where the failures are."}{" "}
          Confirm β from real failure data before relying on this saving. If you do not know β, use the success-run
          method instead: it does not require one.
        </Warning>
      ) : null}

      {result ? (
        <ResultPanel
          headline={`Required sample size: ${result.n} unit${result.n === 1 ? "" : "s"}`}
          detail={`Each unit runs to ${result.lifeMultiple}× one life. Exact solution n = ${result.nReal.toFixed(
            4
          )}, rounded up. Demonstrates R = ${result.reliabilityPct}% at ${result.confidencePct}% confidence.`}
          method={`Extended bogey (Weibull time-scaled binomial), β = ${result.beta}.`}
          assumptions={[
            `The failure mode follows a Weibull distribution with shape β = ${result.beta}. A wrong β makes this number wrong — it is the single most load-bearing input here.`,
            "One dominant failure mode. Mixed modes with different β cannot be collapsed into one number.",
            "Damage accumulates continuously with time on test, so 2× duration on one unit substitutes for the equivalent units.",
            "Every unit runs the full extended duration. Units pulled early forfeit their credit.",
            "Zero failures. A single failure invalidates the run at this n.",
          ]}
        >
          <h3 className="mb-2 text-sm font-semibold text-slate-800">What testing longer buys you</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-700">
                  <th className="py-2 pr-4 font-medium">Test duration</th>
                  <th className="py-2 pr-4 font-medium">Units needed</th>
                  <th className="py-2 font-medium">vs one life</th>
                </tr>
              </thead>
              <tbody>
                {result.trade.map((row) => {
                  const baseline = result.trade[0].n;
                  const saving = baseline - row.n;
                  return (
                    <tr
                      key={row.lifeMultiple}
                      className={`border-b border-slate-200 ${
                        row.lifeMultiple === result.lifeMultiple ? "bg-blue-50 font-medium" : ""
                      }`}
                    >
                      <td className="py-2 pr-4">{row.lifeMultiple}× life</td>
                      <td className="py-2 pr-4">{row.n}</td>
                      <td className={`py-2 ${row.lifeMultiple === result.lifeMultiple ? "text-blue-900" : "text-slate-600"}`}>
                        {saving === 0 ? "baseline" : `${saving} fewer unit${saving === 1 ? "" : "s"}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Fewer units is not automatically cheaper: a longer test occupies the chamber for longer and delays the
            answer. Weigh unit cost against schedule.
          </p>
        </ResultPanel>
      ) : null}
    </div>
  );
}
