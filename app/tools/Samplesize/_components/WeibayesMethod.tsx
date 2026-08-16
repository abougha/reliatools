"use client";

import { useMemo, useState } from "react";
import { weibayesRemainingTest, type WeibayesResult } from "@/lib/reliabilityMath";
import { CalculateButton, ErrorNote, Formula, NumberField, ResultPanel, Warning } from "./ui";

const CREDIT_PRESETS = [
  { value: 100, label: "100% — same design, same process", note: "Identical hardware; the prior is your own earlier build." },
  { value: 50, label: "50% — same family, changed process", note: "Shared architecture, but a supplier, material or process moved." },
  { value: 25, label: "25% — analogous only", note: "Similar duty and construction, different design." },
];

interface Result extends WeibayesResult {
  reliabilityPct: number;
  confidencePct: number;
  beta: number;
  creditPct: number;
  priorUnits: number;
  priorLifeMultiple: number;
  priorFailures: number;
  testLifeMultiple: number;
}

export default function WeibayesMethod() {
  const [reliability, setReliability] = useState("90");
  const [confidence, setConfidence] = useState("90");
  const [beta, setBeta] = useState("2");
  const [priorUnits, setPriorUnits] = useState("10");
  const [priorLifeMultiple, setPriorLifeMultiple] = useState("1");
  const [priorFailures, setPriorFailures] = useState("0");
  const [creditFactor, setCreditFactor] = useState("100");
  const [testLifeMultiple, setTestLifeMultiple] = useState("1");

  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const parsed = useMemo(
    () => ({
      rPct: Number(reliability),
      cPct: Number(confidence),
      beta: Number(beta),
      priorUnits: Number(priorUnits),
      priorLifeMultiple: Number(priorLifeMultiple),
      priorFailures: Number(priorFailures),
      creditPct: Number(creditFactor),
      testLifeMultiple: Number(testLifeMultiple),
    }),
    [reliability, confidence, beta, priorUnits, priorLifeMultiple, priorFailures, creditFactor, testLifeMultiple]
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"R" | "C" | "beta" | "units" | "prior" | "failures" | "credit" | "test", string>> =
      {};
    if (!Number.isFinite(parsed.rPct) || parsed.rPct <= 0 || parsed.rPct >= 100) {
      errors.R = "Reliability must be between 0 and 100 (exclusive).";
    }
    if (!Number.isFinite(parsed.cPct) || parsed.cPct <= 0 || parsed.cPct >= 100) {
      errors.C = "Confidence must be between 0 and 100 (exclusive).";
    }
    if (!Number.isFinite(parsed.beta) || parsed.beta <= 0) errors.beta = "Weibull beta must be greater than 0.";
    if (!Number.isFinite(parsed.priorUnits) || parsed.priorUnits < 0) {
      errors.units = "Prior units must not be negative.";
    }
    if (!Number.isFinite(parsed.priorLifeMultiple) || parsed.priorLifeMultiple < 0) {
      errors.prior = "Prior duration must not be negative.";
    }
    if (!Number.isInteger(parsed.priorFailures) || parsed.priorFailures < 0) {
      errors.failures = "Prior failures must be a non-negative integer.";
    }
    if (!Number.isFinite(parsed.creditPct) || parsed.creditPct < 0 || parsed.creditPct > 100) {
      errors.credit = "Credit factor must be between 0 and 100.";
    }
    if (!Number.isFinite(parsed.testLifeMultiple) || parsed.testLifeMultiple <= 0) {
      errors.test = "New test duration must be greater than 0.";
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
      const solved = weibayesRemainingTest({
        reliability: parsed.rPct / 100,
        confidenceLevel: parsed.cPct / 100,
        beta: parsed.beta,
        priorFailures: parsed.priorFailures,
        priorUnits: parsed.priorUnits,
        priorLifeMultiple: parsed.priorLifeMultiple,
        priorCreditFactor: parsed.creditPct / 100,
        testLifeMultiple: parsed.testLifeMultiple,
      });
      setResult({
        ...solved,
        reliabilityPct: parsed.rPct,
        confidencePct: parsed.cPct,
        beta: parsed.beta,
        creditPct: parsed.creditPct,
        priorUnits: parsed.priorUnits,
        priorLifeMultiple: parsed.priorLifeMultiple,
        priorFailures: parsed.priorFailures,
        testLifeMultiple: parsed.testLifeMultiple,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Calculation failed.");
    }
  };

  const unitsErased = result ? result.unitsWithoutPrior - result.unitsRequired : 0;

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        If a comparable design already accumulated test time without failing, that evidence can count toward the new
        claim &mdash; sometimes cutting the remaining test to nothing. It is the most powerful method here and the
        easiest to abuse, because the saving rests entirely on the word &ldquo;comparable&rdquo;.
      </p>

      <Formula
        math={"D_{req} = \\frac{\\chi^2_{1-C,\\;2r+2}/2}{-\\ln R} \\qquad n = \\left\\lceil \\frac{D_{req} - f \\cdot D_{prior}}{(t/T)^{\\beta}} \\right\\rceil"}
        legend={
          <>
            <strong>D</strong> = accumulated damage in units of one life<sup>&beta;</sup>,{" "}
            <strong>f</strong> = credit factor. At r = 0 this is exactly the extended-bogey requirement, so the two
            methods agree.
          </>
        }
      />

      <h3 className="mb-2 text-sm font-semibold text-slate-900">The claim you need to make</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField label="Target reliability R (%)" value={reliability} onChange={setReliability} error={fieldErrors.R} />
        <NumberField label="Confidence C (%)" value={confidence} onChange={setConfidence} error={fieldErrors.C} />
        <NumberField label="Weibull shape β" value={beta} onChange={setBeta} error={fieldErrors.beta} />
        <NumberField
          label="New test duration (t/T)"
          value={testLifeMultiple}
          onChange={setTestLifeMultiple}
          error={fieldErrors.test}
          hint="Multiples of one life, per new unit."
        />
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-900">The prior evidence you are leaning on</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField label="Prior units tested" value={priorUnits} onChange={setPriorUnits} error={fieldErrors.units} />
        <NumberField
          label="Duration each reached (t/T)"
          value={priorLifeMultiple}
          onChange={setPriorLifeMultiple}
          error={fieldErrors.prior}
        />
        <NumberField
          label="Failures in the prior evidence"
          value={priorFailures}
          onChange={setPriorFailures}
          error={fieldErrors.failures}
          hint="Classic Weibayes assumes zero; failures switch to the chi-square form."
        />
        <NumberField
          label="Credit factor (%)"
          value={creditFactor}
          onChange={setCreditFactor}
          error={fieldErrors.credit}
          hint="How much of the prior you are willing to defend."
        />
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p className="mb-1 font-semibold text-slate-700">Choosing a credit factor</p>
        <ul className="space-y-1">
          {CREDIT_PRESETS.map((preset) => (
            <li key={preset.value}>
              <button
                type="button"
                onClick={() => setCreditFactor(String(preset.value))}
                className="font-medium text-blue-600 hover:underline"
              >
                {preset.label}
              </button>{" "}
              &mdash; {preset.note}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {result && unitsErased > 0 ? (
        <Warning>
          <strong>
            This prior is doing the work of {unitsErased} unit{unitsErased === 1 ? "" : "s"}.
          </strong>{" "}
          Without it you would need {result.unitsWithoutPrior}; with it, {result.unitsRequired}. If the prior design
          turns out not to be comparable &mdash; a changed supplier, a re-spun board, a different duty cycle &mdash;
          those units were never actually tested and the claim is unsupported. Be able to name the evidence and defend
          the comparison before you rely on this.
        </Warning>
      ) : null}

      {result ? (
        <ResultPanel
          headline={
            result.priorSatisfiesClaim
              ? "No further testing required — the prior alone supports the claim"
              : `${result.unitsRequired} more unit${result.unitsRequired === 1 ? "" : "s"} at ${
                  result.testLifeMultiple
                }× life`
          }
          detail={
            <>
              Required evidence: {result.requiredDamage.toFixed(2)} unit-lives<sup>β</sup>. Your prior supplies{" "}
              {result.priorDamage.toFixed(2)}, credited at {result.creditPct}% ={" "}
              {result.creditedPriorDamage.toFixed(2)}. Remaining: {result.remainingDamage.toFixed(2)}. Without any
              prior credit this claim costs <strong>{result.unitsWithoutPrior} units</strong>.
            </>
          }
          method={`Weibayes with prior credit, β = ${result.beta}, ${
            result.priorFailures === 0
              ? "zero-failure prior (classic form)"
              : `${result.priorFailures} prior failure${result.priorFailures === 1 ? "" : "s"} (chi-square form)`
          }.`}
          assumptions={[
            `THE assumption: the prior design is comparable enough that its test time counts toward this claim, at ${result.creditPct}% credit. That is an engineering judgement you are making, not something the arithmetic checked. This answer is only as defensible as that judgement.`,
            `β = ${result.beta} is known and correct, and is the same for both the prior design and this one. Weibayes assumes β rather than estimating it — that is the whole trade.`,
            "The prior units ran the same failure mode under comparable duty. Bench time under a gentler profile is not equivalent evidence.",
            result.priorFailures === 0
              ? "The prior evidence is failure-free. Suspensions only."
              : "Prior failures are handled by the chi-square (continuous time) form, which will differ by about a unit from the discrete binomial answer on the first tab. Both are correct for their own model.",
            "One failure mode. Credit earned against a wear-out mode says nothing about a new infant-mortality mode introduced by a design change.",
          ]}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-2 pr-4 text-slate-600">Required evidence</td>
                  <td className="py-2 text-right font-medium">{result.requiredDamage.toFixed(3)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 pr-4 text-slate-600">
                    Prior ({result.priorUnits} units × {result.priorLifeMultiple}× life)
                  </td>
                  <td className="py-2 text-right font-medium">−{result.priorDamage.toFixed(3)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 pr-4 text-slate-600">Credited at {result.creditPct}%</td>
                  <td className="py-2 text-right font-medium">−{result.creditedPriorDamage.toFixed(3)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 pr-4 font-medium text-slate-900">Still to demonstrate</td>
                  <td className="py-2 text-right font-semibold">{result.remainingDamage.toFixed(3)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ResultPanel>
      ) : null}
    </div>
  );
}
