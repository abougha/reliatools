"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CHARACTERISE_METHODS, type CharacteriseMethodId } from "./tabs";
import { CalculateButton, ErrorNote, MethodSelector, NumberField, ResultPanel, ScopeNote, Warning } from "./ui";

// Engineering guidance, not closed-form statistics. These tiers are the numbers
// practitioners actually plan against; they are stated as ranges on purpose,
// because presenting them as a single computed integer would misrepresent them.
const GOALS = [
  {
    id: "direction",
    label: "Direction only — is this wear-out or random?",
    failures: [2, 3] as [number, number],
    rationale:
      "Two or three failures tell you roughly where β sits relative to 1, which is often the only decision on the table. They do not give you a number you can quote.",
  },
  {
    id: "beta",
    label: "A usable β (and a rough η)",
    failures: [7, 7] as [number, number],
    rationale:
      "Around seven failures is where a β estimate stops swinging wildly between refits. η comes along with it, but its confidence interval will still be wide.",
  },
  {
    id: "bounds",
    label: "B10 or η with confidence bounds",
    failures: [15, 20] as [number, number],
    rationale:
      "Fifteen to twenty failures is what it takes to put bounds on a B10 life tight enough to design against or quote to a customer.",
  },
] as const;

type GoalId = (typeof GOALS)[number]["id"];

const SCATTER = [
  { id: "low", label: "Low — tight, repeatable curves", units: [5, 6] as [number, number] },
  { id: "moderate", label: "Moderate — typical part-to-part spread", units: [7, 10] as [number, number] },
  { id: "high", label: "High — noisy, mixed behaviour", units: [12, 15] as [number, number] },
] as const;

type ScatterId = (typeof SCATTER)[number]["id"];

const PLANNER_ASSUMPTIONS = [
  "This is engineering guidance, not a statistical guarantee. There is no closed-form sample size for a characterisation test — the number comes from what practitioners find sufficient, not from a confidence statement.",
  "One dominant failure mode. A test that produces two different modes has effectively split your failure count between two distributions.",
  "Failures, not units, are the currency. A unit that never fails contributes a suspension, which carries far less information than a failure.",
];

function range([low, high]: [number, number]) {
  return low === high ? `${low}` : `${low}–${high}`;
}

// ---------------------------------------------------------------------------

function WeibullLifePlanner() {
  const [goal, setGoal] = useState<GoalId>("beta");
  const [censoring, setCensoring] = useState("40");
  const [result, setResult] = useState<{
    goal: (typeof GOALS)[number];
    censoringPct: number;
    units: [number, number];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const censoringPct = Number(censoring);
  const censoringError =
    !Number.isFinite(censoringPct) || censoringPct < 0 || censoringPct >= 100
      ? "Censoring must be between 0 and 100 (exclusive)."
      : undefined;

  const handleCalculate = () => {
    setResult(null);
    setErrorMessage("");
    if (censoringError) {
      setErrorMessage("Please fix the input validation errors above.");
      return;
    }
    const selected = GOALS.find((entry) => entry.id === goal) ?? GOALS[1];
    const survivingFraction = 1 - censoringPct / 100;
    setResult({
      goal: selected,
      censoringPct,
      units: [
        Math.ceil(selected.failures[0] / survivingFraction),
        Math.ceil(selected.failures[1] / survivingFraction),
      ],
    });
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        Sizing a life test starts from the wrong end if you start from units. Decide how many{" "}
        <strong>failures</strong> you need to see, then work back to units using how many you expect to survive the
        test.
      </p>

      <div className="mb-4">
        <span className="mb-2 block text-sm font-medium text-slate-900">What do you need out of the test?</span>
        <div className="space-y-2">
          {GOALS.map((entry) => (
            <label key={entry.id} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="weibullGoal"
                className="mt-1"
                checked={goal === entry.id}
                onChange={() => setGoal(entry.id)}
              />
              <span>
                {entry.label} <span className="text-slate-500">({range(entry.failures)} failures)</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="max-w-xs">
        <NumberField
          label="Expected censoring (% of units that will not fail)"
          value={censoring}
          onChange={setCensoring}
          error={censoringError}
          hint="How many units you expect to still be running when the test stops."
        />
      </div>

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} label="Plan the test" />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {result && result.censoringPct >= 80 ? (
        <Warning>
          At {result.censoringPct}% censoring you are planning for four in five units to survive. The unit count
          climbs fast and the estimate stays poor — consider running longer, adding stress, or switching to a
          degradation measurement instead of waiting for failures.
        </Warning>
      ) : null}

      {result ? (
        <ResultPanel
          headline={`Plan for ${range(result.goal.failures)} failure${
            result.goal.failures[1] === 1 ? "" : "s"
          } — about ${range(result.units)} units on test`}
          detail={`${range(result.goal.failures)} failures ÷ ${(100 - result.censoringPct).toFixed(
            0
          )}% failing = ${range(result.units)} units. ${result.goal.rationale}`}
          method="Failure-count planning heuristic for Weibull life testing, converted to units by the expected censoring fraction."
          assumptions={[
            ...PLANNER_ASSUMPTIONS,
            `Your censoring estimate of ${result.censoringPct}% is itself a guess. If more units survive than expected, you get fewer failures and a worse fit — not a smaller answer.`,
          ]}
        >
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <h3 className="mb-1 font-semibold text-slate-700">Cutting the cost: sudden-death testing</h3>
            <p>
              Split the units into groups and stop each group at its first failure. You buy the first-order statistic
              from each group instead of waiting out the full test, which gets a β estimate for a fraction of the
              chamber time. It costs precision in the upper tail, so it suits screening between designs better than
              quoting a B10.
            </p>
            <p className="mt-2">
              Once you have the failure data, fit it in the{" "}
              <Link href="/tools/Weibull" className="text-blue-600 hover:underline">
                Weibull tool
              </Link>
              .
            </p>
          </div>
        </ResultPanel>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function AltPlanner() {
  const [levels, setLevels] = useState("3");
  const [failuresPerLevel, setFailuresPerLevel] = useState("5");
  const [result, setResult] = useState<{
    levels: number;
    failuresPerLevel: number;
    allocation: Array<{ level: number; weight: number; units: number }>;
    total: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const parsed = useMemo(
    () => ({ levels: Number(levels), failures: Number(failuresPerLevel) }),
    [levels, failuresPerLevel]
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<"levels" | "failures", string>> = {};
    if (!Number.isInteger(parsed.levels) || parsed.levels < 3) {
      errors.levels = "At least 3 stress levels are needed to fit and check an acceleration model.";
    }
    if (!Number.isInteger(parsed.failures) || parsed.failures < 1) {
      errors.failures = "Expected failures per level must be a positive integer.";
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

    // Weighted toward the lowest stress, where failures come slowest: the highest
    // level carries weight 1 and each step down doubles it (4:2:1 at three levels).
    const allocation = Array.from({ length: parsed.levels }, (_, index) => {
      const weight = Math.pow(2, parsed.levels - 1 - index);
      return { level: index + 1, weight, units: weight * parsed.failures };
    });

    setResult({
      levels: parsed.levels,
      failuresPerLevel: parsed.failures,
      allocation,
      total: allocation.reduce((sum, entry) => sum + entry.units, 0),
    });
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        An accelerated life test fits a model across stress levels, so the units have to be spread across them &mdash;
        and weighted toward the low-stress end, where failures arrive slowest.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Number of stress levels"
          value={levels}
          onChange={setLevels}
          error={fieldErrors.levels}
          hint="Three is the minimum: two can fit a line but cannot reveal that the line is wrong."
        />
        <NumberField
          label="Target failures per level"
          value={failuresPerLevel}
          onChange={setFailuresPerLevel}
          error={fieldErrors.failures}
        />
      </div>

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} label="Plan the allocation" />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {result && result.levels > 4 ? (
        <Warning>
          At {result.levels} levels the doubling allocation gets top-heavy fast. Beyond four levels, allocate from the
          expected time-to-failure at each stress rather than from a generic ratio.
        </Warning>
      ) : null}

      {result ? (
        <ResultPanel
          headline={`About ${result.total} units total across ${result.levels} stress levels`}
          detail={`Weighted toward the lowest stress in a ${result.allocation
            .map((entry) => entry.weight)
            .join(":")} ratio. That ratio is typical practice, not a standard — adjust it from your own expected times to failure.`}
          method="Allocation heuristic for accelerated life testing; the acceleration model itself is fitted separately."
          assumptions={[
            ...PLANNER_ASSUMPTIONS,
            "Every level produces failures. A stress level that yields none contributes nothing to the fit — you paid for those units and got no model out of them.",
            "The same failure mode operates at every level. If high stress triggers a mode that never occurs in the field, the extrapolation back to use conditions is invalid no matter how good the fit looks.",
            "Stress levels stay inside the physics: high enough to fail things in reasonable time, low enough not to invent new failure modes.",
          ]}
        >
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Per-level allocation</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-700">
                  <th className="py-2 pr-4 font-medium">Stress level</th>
                  <th className="py-2 pr-4 font-medium">Weight</th>
                  <th className="py-2 font-medium">Units</th>
                </tr>
              </thead>
              <tbody>
                {result.allocation.map((entry) => (
                  <tr key={entry.level} className="border-b border-slate-200">
                    <td className="py-2 pr-4">
                      {entry.level === 1
                        ? "1 (lowest stress)"
                        : entry.level === result.levels
                          ? `${entry.level} (highest stress)`
                          : entry.level}
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{entry.weight}×</td>
                    <td className="py-2 font-medium">{entry.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Derive the acceleration factor itself with{" "}
            <Link href="/tools/Arrhenius" className="text-blue-600 hover:underline">
              Arrhenius
            </Link>{" "}
            or{" "}
            <Link href="/tools/CoffinManson" className="text-blue-600 hover:underline">
              Coffin-Manson
            </Link>
            .
          </p>
        </ResultPanel>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function DegradationPlanner() {
  const [points, setPoints] = useState("8");
  const [scatter, setScatter] = useState<ScatterId>("moderate");
  const [result, setResult] = useState<{
    points: number;
    scatter: (typeof SCATTER)[number];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const pointsValue = Number(points);
  const pointsError =
    !Number.isInteger(pointsValue) || pointsValue < 2
      ? "You need at least 2 measurement points to have a trend at all."
      : undefined;

  const handleCalculate = () => {
    setResult(null);
    setErrorMessage("");
    if (pointsError) {
      setErrorMessage("Please fix the input validation errors above.");
      return;
    }
    setResult({ points: pointsValue, scatter: SCATTER.find((entry) => entry.id === scatter) ?? SCATTER[1] });
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        Degradation testing needs far fewer units than anything else here, because you are not waiting for failures at
        all &mdash; you measure a parameter drifting toward its limit and extrapolate. Each unit contributes a whole
        curve rather than one data point.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Measurement points per unit"
          value={points}
          onChange={setPoints}
          error={pointsError}
          hint="How many times each unit is measured over the test."
        />
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-900">Expected scatter</span>
          <div className="space-y-1">
            {SCATTER.map((entry) => (
              <label key={entry.id} className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="degradationScatter"
                  className="mt-1"
                  checked={scatter === entry.id}
                  onChange={() => setScatter(entry.id)}
                />
                <span>{entry.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <CalculateButton onClick={handleCalculate} label="Plan the test" />
      </div>

      {errorMessage ? <ErrorNote>{errorMessage}</ErrorNote> : null}

      {result && result.points < 5 ? (
        <Warning>
          {result.points} measurement points is thin for fitting a degradation path. With fewer than about five you
          cannot tell a curve from a straight line, and the extrapolation to the failure threshold is where all the
          risk lives. More measurements on the same units are almost always cheaper than more units.
        </Warning>
      ) : null}

      {result ? (
        <ResultPanel
          headline={`About ${range(result.scatter.units)} units`}
          detail={`With ${result.points} measurement points per unit and ${result.scatter.label.toLowerCase()}, ${range(
            result.scatter.units
          )} units is the usual range. Units buy you between-unit variation; measurement points buy you the shape of each path. They are not interchangeable.`}
          method="Degradation (parameter-drift) test planning heuristic."
          assumptions={[
            "This is engineering guidance, not a statistical guarantee.",
            "The measured parameter actually drives the failure — a drifting parameter that does not cause the failure tells you nothing about reliability.",
            "There is a defined failure threshold to extrapolate to, and it is meaningful rather than arbitrary.",
            "The degradation path has a form you can model (linear, power, exponential). If units drift in different directions, one model will not cover them.",
            "Extrapolating past the observed range is where degradation testing goes wrong. The further past the last measurement your threshold sits, the less the answer means.",
          ]}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function CharacteriseLifeTab({
  method,
  onMethodChange,
}: {
  method: CharacteriseMethodId;
  onMethodChange: (method: CharacteriseMethodId) => void;
}) {
  return (
    <div>
      <MethodSelector options={CHARACTERISE_METHODS} value={method} onChange={onMethodChange} />

      <div className="mt-3">
        <ScopeNote>
          <strong>This tab is a planner, not a calculator.</strong> Characterisation tests have no closed-form sample
          size &mdash; there is no confidence statement to solve for, because you are estimating a distribution rather
          than passing a gate. The numbers below are recommended ranges with the reasoning shown, and should be
          adjusted against your own history.
        </ScopeNote>
      </div>

      {method === "weibull-life" ? <WeibullLifePlanner /> : null}
      {method === "alt" ? <AltPlanner /> : null}
      {method === "degradation" ? <DegradationPlanner /> : null}
    </div>
  );
}
