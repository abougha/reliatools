"use client";

import { useMemo, useState } from "react";
import { twoSampleTSampleSize } from "@/lib/reliabilityMath";
import { CalculateButton, ErrorNote, Formula, NumberField, ResultPanel, Warning } from "./ui";

type EffectMode = "delta-sigma" | "cohen";

interface Result {
  nPerArm: number;
  achievedPower: number;
  d: number;
  alphaPct: number;
  powerPct: number;
  twoSided: boolean;
}

export default function ComparativeTestMethod() {
  const [mode, setMode] = useState<EffectMode>("delta-sigma");
  const [delta, setDelta] = useState("5");
  const [sigma, setSigma] = useState("5");
  const [cohenD, setCohenD] = useState("1.0");
  const [alpha, setAlpha] = useState("5");
  const [power, setPower] = useState("80");
  const [twoSided, setTwoSided] = useState(true);

  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const parsed = useMemo(
    () => ({
      delta: Number(delta),
      sigma: Number(sigma),
      cohenD: Number(cohenD),
      alphaPct: Number(alpha),
      powerPct: Number(power),
    }),
    [delta, sigma, cohenD, alpha, power]
  );

  const effectSize = mode === "cohen" ? parsed.cohenD : parsed.sigma === 0 ? NaN : parsed.delta / parsed.sigma;

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"delta" | "sigma" | "d" | "alpha" | "power", string>> = {};
    if (mode === "delta-sigma") {
      if (!Number.isFinite(parsed.delta) || parsed.delta === 0) {
        errors.delta = "The difference you want to detect must be non-zero.";
      }
      if (!Number.isFinite(parsed.sigma) || parsed.sigma <= 0) {
        errors.sigma = "Standard deviation must be greater than 0.";
      }
    } else if (!Number.isFinite(parsed.cohenD) || parsed.cohenD === 0) {
      errors.d = "Effect size must be non-zero.";
    }
    if (!Number.isFinite(parsed.alphaPct) || parsed.alphaPct <= 0 || parsed.alphaPct >= 100) {
      errors.alpha = "Alpha must be between 0 and 100 (exclusive).";
    }
    if (!Number.isFinite(parsed.powerPct) || parsed.powerPct <= 0 || parsed.powerPct >= 100) {
      errors.power = "Power must be between 0 and 100 (exclusive).";
    }
    return errors;
  }, [mode, parsed]);

  const handleCalculate = () => {
    setResult(null);
    setErrorMessage("");
    if (Object.keys(fieldErrors).length > 0) {
      setErrorMessage("Please fix the input validation errors above.");
      return;
    }

    try {
      const solved = twoSampleTSampleSize(effectSize, parsed.alphaPct / 100, parsed.powerPct / 100, twoSided);
      setResult({
        ...solved,
        d: effectSize,
        alphaPct: parsed.alphaPct,
        powerPct: parsed.powerPct,
        twoSided,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Calculation failed.");
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        &ldquo;Is B better than A?&rdquo; is a different question from &ldquo;is B reliable?&rdquo;, and it is sized
        differently. This asks how many units per arm you need to detect a difference of a given size, if one exists.
      </p>

      <Formula
        math={"\\text{power} = 1 - T'_{2n-2,\\;\\delta}\\!\\left(t_{1-\\alpha/2,\\;2n-2}\\right), \\quad \\delta = d\\sqrt{n/2}"}
        legend={
          <>
            <strong>d</strong> = effect size (&Delta;/&sigma;), <strong>&alpha;</strong> = false-positive rate,{" "}
            <strong>power</strong> = chance of detecting a real difference. Solved exactly with the noncentral t, not
            the normal approximation.
          </>
        }
      />

      <div className="mb-4">
        <span className="mb-2 block text-sm font-medium text-slate-900">How do you want to state the effect?</span>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="effectMode"
              checked={mode === "delta-sigma"}
              onChange={() => setMode("delta-sigma")}
            />
            As a difference and a spread (Δ and σ)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" name="effectMode" checked={mode === "cohen"} onChange={() => setMode("cohen")} />
            As a standardised effect size (Cohen&rsquo;s d)
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {mode === "delta-sigma" ? (
          <>
            <NumberField
              label="Difference to detect (Δ)"
              value={delta}
              onChange={setDelta}
              error={fieldErrors.delta}
              hint="In the same units as the measurement."
            />
            <NumberField
              label="Standard deviation (σ)"
              value={sigma}
              onChange={setSigma}
              error={fieldErrors.sigma}
              hint="Within-group spread, assumed equal in both arms."
            />
          </>
        ) : (
          <NumberField
            label="Cohen's d"
            value={cohenD}
            onChange={setCohenD}
            error={fieldErrors.d}
            hint="0.2 small · 0.5 medium · 0.8 large"
          />
        )}
        <NumberField label="Alpha α (%)" value={alpha} onChange={setAlpha} error={fieldErrors.alpha} />
        <NumberField label="Power (%)" value={power} onChange={setPower} error={fieldErrors.power} />
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-900">Test direction</span>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="sides" checked={twoSided} onChange={() => setTwoSided(true)} />
              Two-sided (B could be better or worse)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="sides" checked={!twoSided} onChange={() => setTwoSided(false)} />
              One-sided (only interested if B is better)
            </label>
          </div>
        </div>
      </div>

      {mode === "delta-sigma" && Number.isFinite(effectSize) ? (
        <p className="mt-3 text-xs text-slate-500">
          Δ/σ = <strong>{effectSize.toFixed(3)}</strong> — that is the effect size this sizing actually uses.
        </p>
      ) : null}

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {result && Math.abs(result.d) < 0.3 ? (
        <Warning>
          An effect size of {result.d.toFixed(3)} is small relative to the noise, which is why the count is so high.
          Before committing to {result.nPerArm} units per arm, ask whether a difference this small would change any
          decision — and whether reducing σ (better fixturing, tighter measurement) is cheaper than adding units.
        </Warning>
      ) : null}

      {result ? (
        <ResultPanel
          headline={`${result.nPerArm} units per arm (${result.nPerArm * 2} total)`}
          detail={`Achieved power ${(result.achievedPower * 100).toFixed(1)}% at α = ${result.alphaPct}%, ${
            result.twoSided ? "two-sided" : "one-sided"
          }, for an effect size of d = ${result.d.toFixed(3)}. This is the smallest n that reaches your target power — n − 1 does not.`}
          method="Two-sample t-test power, solved exactly with the noncentral t distribution."
          assumptions={[
            "This sizing comes from effect size and power — not from reliability and confidence. It answers whether two designs differ, not whether either one is reliable enough to ship. Do not quote it as an R/C demonstration.",
            "Both arms are normally distributed with equal variance. Unequal variances need a Welch correction and a different sample size.",
            "Observations are independent — no repeated measures on the same unit, no shared fixture or batch effect linking them.",
            "σ is known in advance. It usually is not; if the real spread turns out larger than assumed, the test is underpowered and a real difference can be missed.",
            "Failing to detect a difference is not evidence that there is none. It means the test could not resolve one of this size.",
          ]}
        />
      ) : null}
    </div>
  );
}
