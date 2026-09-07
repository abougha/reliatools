"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { hassLotSampleSize, type LotSampleResult } from "@/lib/reliabilityMath";
import { CalculateButton, ErrorNote, Formula, NumberField, ResultPanel, Verdict, Warning } from "./ui";

interface Result extends LotSampleResult {
  partsPerLot: number;
  escapeRatePct: number;
  confidencePct: number;
  screenStrengthPct: number;
  samplingRatePct: number;
}

function strengthVerdict(pct: number) {
  if (pct >= 80) {
    return {
      tone: "danger" as const,
      title: "Too close to the destruct limit",
      body: "At 80% of destruct margin and above, the screen is removing useful life from every good unit it touches. HASS must precipitate latent defects without consuming the life of conforming product; this setting fails that test. Back off, or re-run the HALT to establish where the destruct limit actually sits.",
    };
  }
  if (pct >= 50) {
    return {
      tone: "ok" as const,
      title: "Inside the usual HASS window",
      body: "Between roughly 50% and 80% of destruct margin is where HASS normally sits: hard enough to precipitate latent defects, soft enough to leave good units intact. Confirm with a safety-of-screen study before production.",
    };
  }
  return {
    tone: "warn" as const,
    title: "The screen may be too soft to precipitate anything",
    body: "Below about half the destruct margin, a screen often fails to stimulate the latent defects it exists to find. A gentle screen that passes everything costs money and buys nothing — verify with seeded-defect samples that it actually detects.",
  };
}

export default function HassScreenTab() {
  const [partsPerLot, setPartsPerLot] = useState("1000");
  const [escapeRate, setEscapeRate] = useState("1");
  const [confidence, setConfidence] = useState("90");
  const [screenStrength, setScreenStrength] = useState("65");

  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const parsed = useMemo(
    () => ({
      lot: Number(partsPerLot),
      escapePct: Number(escapeRate),
      cPct: Number(confidence),
      strengthPct: Number(screenStrength),
    }),
    [partsPerLot, escapeRate, confidence, screenStrength]
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"lot" | "escape" | "C" | "strength", string>> = {};
    if (!Number.isInteger(parsed.lot) || parsed.lot < 1) {
      errors.lot = "Parts per lot must be a positive whole number.";
    }
    if (!Number.isFinite(parsed.escapePct) || parsed.escapePct <= 0 || parsed.escapePct > 100) {
      errors.escape = "Target escape rate must be between 0 and 100.";
    }
    if (!Number.isFinite(parsed.cPct) || parsed.cPct <= 0 || parsed.cPct >= 100) {
      errors.C = "Detection confidence must be between 0 and 100 (exclusive).";
    }
    if (!Number.isFinite(parsed.strengthPct) || parsed.strengthPct <= 0 || parsed.strengthPct > 100) {
      errors.strength = "Screen strength must be between 0 and 100.";
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
      const solved = hassLotSampleSize(parsed.lot, parsed.escapePct / 100, parsed.cPct / 100);
      setResult({
        ...solved,
        partsPerLot: parsed.lot,
        escapeRatePct: parsed.escapePct,
        confidencePct: parsed.cPct,
        screenStrengthPct: parsed.strengthPct,
        samplingRatePct: (solved.n / parsed.lot) * 100,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Calculation failed.");
    }
  };

  const verdict = result ? strengthVerdict(result.screenStrengthPct) : null;

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        HASS is a production screen, not a test: it removes latent defects from units you intend to ship. Two separate
        questions decide it &mdash; <strong>how many</strong> units per lot to screen, and <strong>how hard</strong>{" "}
        to screen them. They are answered by different things, and only the first has arithmetic behind it.
      </p>

      <Formula
        math={"P(\\text{detect}) = 1 - \\frac{\\binom{N-D}{n}}{\\binom{N}{n}}, \\qquad D = \\lceil p_{esc} N \\rceil"}
        legend={
          <>
            <strong>N</strong> = parts per lot, <strong>D</strong> = defectives in a lot sitting at the target escape
            rate, <strong>n</strong> = units screened. Hypergeometric, because you sample a finite lot without
            replacement.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Parts per lot"
          value={partsPerLot}
          onChange={setPartsPerLot}
          error={fieldErrors.lot}
          hint="Units in one production lot."
        />
        <NumberField
          label="Target escape rate (%)"
          value={escapeRate}
          onChange={setEscapeRate}
          error={fieldErrors.escape}
          hint="The defect level you must not let through."
        />
        <NumberField
          label="Detection confidence (%)"
          value={confidence}
          onChange={setConfidence}
          error={fieldErrors.C}
          hint="Chance of catching a lot that is at the escape rate."
        />
        <NumberField
          label="Screen strength (% of HALT destruct margin)"
          value={screenStrength}
          onChange={setScreenStrength}
          error={fieldErrors.strength}
          hint="How hard the screen is, relative to where units are destroyed."
        />
      </div>

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} label="Size the screen" />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {verdict && verdict.tone !== "ok" ? (
        <Warning>
          <strong>{verdict.title}.</strong> {verdict.body}
        </Warning>
      ) : null}

      {result?.requiresFullScreen ? (
        <Warning>
          At this escape rate and confidence, sampling cannot do the job on a lot of {result.partsPerLot} &mdash; the
          answer is a 100% screen. That is the normal outcome for tight escape targets on small lots, and it is why
          HASS starts at 100% and reduces only after a proof-of-screen.
        </Warning>
      ) : null}

      {result ? (
        <ResultPanel
          headline={
            result.requiresFullScreen
              ? `Screen all ${result.n} units — 100% of the lot`
              : `Screen ${result.n} units per lot (${result.samplingRatePct.toFixed(1)}%)`
          }
          detail={
            <>
              A lot of {result.partsPerLot.toLocaleString()} sitting at {result.escapeRatePct}% escape carries about{" "}
              {result.defectsAssumed} defective{result.defectsAssumed === 1 ? "" : "s"}. Screening {result.n} units
              catches at least one of them with {(result.detectionProbability * 100).toFixed(1)}% probability.
            </>
          }
          method="Hypergeometric lot-acceptance sampling. Screen strength is assessed separately and does not enter this arithmetic."
          assumptions={[
            "Screen strength is NOT part of this number. No published model maps HALT destruct margin onto a defect-detection efficiency, so inventing one would give you a false precision. Strength is judged against the destruct limit instead, above.",
            "The screen detects a defective unit when it screens one. Detection efficiency below 100% raises the sample size, and only a seeded-defect study can tell you what it really is.",
            "Defectives are randomly distributed through the lot. A process excursion that clusters defects in one shift breaks this assumption completely — and clustered defects are the usual real-world case.",
            "This sizes detection of a lot at the target escape rate. It does not estimate your actual escape rate, and it is not a reliability demonstration.",
            "Sampling is for a mature, proven screen. New products screen 100% until a proof-of-screen justifies reducing, and any process change resets that.",
          ]}
        >
          {verdict ? (
            <Verdict
              tone={verdict.tone === "ok" ? "pass" : "caution"}
              title={`Screen strength ${result.screenStrengthPct}% of destruct margin — ${verdict.title}`}
            >
              {verdict.body}
            </Verdict>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            Establish the destruct limits this percentage is measured against with a HALT first &mdash; build the
            profile in the{" "}
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
