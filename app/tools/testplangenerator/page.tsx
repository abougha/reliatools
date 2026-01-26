"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  applyAcceleration,
  applyFailureModesToMechanisms,
  buildCandidateTests,
  buildDvprRows,
  buildSchedule,
  computeCoverageBreakdown,
  computePriorEvidenceMap,
  computeRequiredSampleSize,
  computeScheduleStats,
  computeResidualRisk,
  computeWarnings,
  createDefaultWizardState,
  hydrateWizardState,
  isHumidityBasedTestId,
  mergeSelectedTests,
  mergeTestScores,
  suggestMechanisms,
  syncMechanisms,
} from "@/lib/testPlanWizard/logic";
import {
  getEaSuggestion,
  industryOptions,
  FAILURE_MODE_LIBRARY,
  MATERIAL_LIBRARY,
  productTypeOptions,
  MECHANISMS,
  TESTS,
} from "@/lib/testPlanWizard/knowledgeBase";
import { clearWizardState, loadWizardState, saveWizardState } from "@/lib/testPlanWizard/storage";
import type {
  MechanismSelection,
  SelectedTest,
  WizardState,
} from "@/lib/testPlanWizard/types";

const STEPS = [
  "Product Context",
  "Mission Profile",
  "Failure Mechanisms",
  "Design & Change Triggers",
  "Test Mapping",
  "Prior Evidence (Bayesian)",
  "Acceleration & Equivalence",
  "Risk Prioritization",
  "Residual Risk Declaration",
  "Coverage Review",
  "Output & Export",
];

const mitigationTags = [
  "Design margin",
  "Derating",
  "Monitoring",
  "Supplier controls",
  "Process controls",
];

function clampInt(value: string, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function clampFloat(value: string, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function toCsvValue(value: string | number | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value);
  return /[,"\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function buildCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows.map((row) => row.map(toCsvValue).join(",")).join("\n");
}

export default function Page() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(createDefaultWizardState);
  const [userTouchedMechanisms, setUserTouchedMechanisms] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [step3Tab, setStep3Tab] = useState<"mechanisms" | "materials" | "failure-modes">("mechanisms");
  const [specModal, setSpecModal] = useState<{ title: string; refs: Array<{ standard: string; clause?: string; note?: string }> } | null>(null);
  const [ganttView, setGanttView] = useState<"weeks" | "days">("weeks");
  const [ganttPxPerDay, setGanttPxPerDay] = useState(18);
  const savedRef = useRef(false);
  const suggestionKeyRef = useRef("");
  const ganttLeftRef = useRef<HTMLDivElement | null>(null);
  const ganttRightRef = useRef<HTMLDivElement | null>(null);
  const ganttSyncingRef = useRef(false);
  const ganttTimelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = loadWizardState();
    if (stored) {
      setState(hydrateWizardState(stored));
    }
    savedRef.current = true;
  }, []);

  const suggestedMechanisms = useMemo(
    () => suggestMechanisms(state.product, state.missionProfile),
    [state.product, state.missionProfile]
  );

  useEffect(() => {
    if (userTouchedMechanisms) return;
    const key = JSON.stringify(suggestedMechanisms);
    if (suggestionKeyRef.current === key) return;
    suggestionKeyRef.current = key;
    setState((prev) => ({
      ...prev,
      mechanisms: syncMechanisms(prev.mechanisms, suggestedMechanisms),
    }));
  }, [suggestedMechanisms, userTouchedMechanisms]);

  const candidateTests = useMemo(
    () => buildCandidateTests(state.mechanisms, state.changes, state.missionProfile, state.materials),
    [state.mechanisms, state.changes, state.missionProfile, state.materials]
  );

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      selectedTests: mergeSelectedTests(prev.selectedTests, candidateTests),
    }));
  }, [candidateTests]);

  const testsWithAcceleration = useMemo(
    () => applyAcceleration(state.selectedTests, state.missionProfile, state.product, state.materials),
    [state.selectedTests, state.missionProfile, state.product, state.materials]
  );

  const mergedScores = useMemo(
    () =>
      mergeTestScores(
        testsWithAcceleration,
        state.mechanisms,
        state.product.safetyCritical,
        state.failureModes,
        state.prioritization.testScores,
        state.priorEvidence
      ),
    [
      testsWithAcceleration,
      state.mechanisms,
      state.product.safetyCritical,
      state.failureModes,
      state.prioritization.testScores,
      state.priorEvidence,
    ]
  );

  const residualPerMechanism = useMemo(
    () => computeResidualRisk(state.mechanisms, testsWithAcceleration, state.residualRisk.perMechanism),
    [state.mechanisms, testsWithAcceleration, state.residualRisk.perMechanism]
  );

  const requiredSampleSize = useMemo(
    () =>
      computeRequiredSampleSize(
        state.reliabilityPlan.targetReliability,
        state.reliabilityPlan.confidence,
        state.reliabilityPlan.allowedFailures,
        state.reliabilityPlan.method
      ),
    [
      state.reliabilityPlan.targetReliability,
      state.reliabilityPlan.confidence,
      state.reliabilityPlan.allowedFailures,
      state.reliabilityPlan.method,
    ]
  );

  const humidityComplete =
    state.missionProfile.humidityPct !== null || Boolean(state.missionProfile.humidity);
  const missionComplete =
    state.missionProfile.tempMinC !== null &&
    state.missionProfile.tempMaxC !== null &&
    humidityComplete &&
    Boolean(state.missionProfile.vibration);

  const warnings = useMemo(
    () => computeWarnings(state.missionProfile, testsWithAcceleration),
    [state.missionProfile, testsWithAcceleration]
  );

  const coverageBreakdown = useMemo(
    () => computeCoverageBreakdown(state, testsWithAcceleration),
    [state, testsWithAcceleration]
  );
  const coverageScore = coverageBreakdown.totalScore;
  const priorEvidenceMap = useMemo(
    () => computePriorEvidenceMap(testsWithAcceleration, state.priorEvidence),
    [testsWithAcceleration, state.priorEvidence]
  );

  const scheduleTasks = useMemo(
    () => buildSchedule({ ...state, selectedTests: testsWithAcceleration }),
    [state, testsWithAcceleration]
  );

  const stateForSave = useMemo<WizardState>(
    () => ({
      ...state,
      selectedTests: testsWithAcceleration,
      prioritization: { testScores: mergedScores },
      residualRisk: { perMechanism: residualPerMechanism },
      reliabilityPlan: { ...state.reliabilityPlan, requiredSampleSize },
      dvpr: { rows: state.dvpr.rows },
      schedule: { ...state.schedule, tasks: scheduleTasks },
    }),
    [state, testsWithAcceleration, mergedScores, residualPerMechanism, requiredSampleSize, scheduleTasks]
  );

  useEffect(() => {
    if (!savedRef.current) return;
    saveWizardState(stateForSave);
  }, [stateForSave]);


  const removalMissing = useMemo(
    () => testsWithAcceleration.some((test) => test.status === "remove" && !test.removalJustification?.trim()),
    [testsWithAcceleration]
  );
  const humidityRequiresTest = (state.missionProfile.humidityPct ?? 0) >= 60;
  const hasHumidityTestKept = testsWithAcceleration.some(
    (test) => test.status === "keep" && isHumidityBasedTestId(test.id)
  );

  const stepValid = useMemo(() => {
    if (step === 1) {
      return (
        state.product.productType !== "" &&
        state.product.industry !== "" &&
        Boolean(state.product.serviceLifeYears && state.product.serviceLifeYears > 0)
      );
    }
    if (step === 2) {
      return missionComplete;
    }
    if (step === 3) {
      return state.mechanisms.every((mech) =>
        mech.selected || mech.exclusionJustification === null || Boolean(mech.exclusionJustification.trim())
      );
    }
    if (step === 5) {
      const hasKeep = testsWithAcceleration.some((test) => test.status === "keep");
      return hasKeep && !removalMissing && (!humidityRequiresTest || hasHumidityTestKept);
    }
    return true;
  }, [step, state.product, state.mechanisms, missionComplete, testsWithAcceleration, removalMissing, humidityRequiresTest, hasHumidityTestKept]);

  const keptTests = testsWithAcceleration.filter((test) => test.status === "keep");
  const activeTests = testsWithAcceleration.filter((test) => test.status !== "remove");
  const keepMissing = testsWithAcceleration.every((test) => test.status !== "keep");

  const dvprKey = useMemo(
    () => keptTests.map((test) => test.id).sort().join("|"),
    [keptTests]
  );

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      dvpr: {
        rows: mergeDvprRows(buildDvprRows({ ...prev, selectedTests: testsWithAcceleration }), prev.dvpr.rows),
      },
    }));
  }, [dvprKey, testsWithAcceleration, state.priorEvidence]);

  const materialsByCategory = useMemo(() => {
    return MATERIAL_LIBRARY.reduce<Record<string, typeof MATERIAL_LIBRARY>>((acc, material) => {
      if (!acc[material.category]) acc[material.category] = [];
      acc[material.category].push(material);
      return acc;
    }, {});
  }, []);

  const scheduleStats = useMemo(
    () => computeScheduleStats(scheduleTasks),
    [scheduleTasks]
  );
  const scheduleTotalDays = scheduleStats.currentDays;
  const scheduleStartDate = state.schedule.startDateISO
    ? new Date(`${state.schedule.startDateISO}T00:00:00`)
    : null;
  const ganttLaneOrder = ["Thermal", "Humidity", "Vibration", "Mechanical", "Chemical"];
  const ganttRender = useMemo(() => {
    const keepIds = new Set(keptTests.map((test) => test.id));
    const tasks = scheduleTasks.filter((task) => keepIds.size === 0 || keepIds.has(task.testId));
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    const lanes = ganttLaneOrder.map((lane) => {
      const laneTasks = tasks
        .filter((task) => task.resourceLane === lane)
        .map((task) => {
          const startDay = task.earliestStartDay ?? 0;
          const endDay = startDay + task.durationDays;
          const startWeek = Math.floor(startDay / 7) + 1;
          const endWeek = Math.ceil(endDay / 7);
          const tier = mergedScores[task.testId]?.tier ?? null;
          const deps = task.dependsOnTaskIds.map((depId) => tasksById.get(depId)?.name || depId);
          return {
            ...task,
            startDay,
            endDay,
            startWeek,
            endWeek,
            tier,
            dependencies: deps,
          };
        })
        .sort((a, b) => a.startDay - b.startDay);
      return { lane, tasks: laneTasks };
    });
    const totalDays = Math.max(1, scheduleTotalDays || 0);
    return { lanes, totalDays };
  }, [scheduleTasks, ganttLaneOrder, keptTests, mergedScores, scheduleTotalDays]);
  const ganttTotalDays = ganttRender.totalDays;
  const ganttTimelineWidth = ganttTotalDays * ganttPxPerDay;
  const ganttWeekCount = Math.max(1, Math.ceil(ganttTotalDays / 7));
  const ganttTickWidth = ganttView === "weeks" ? ganttPxPerDay * 7 : ganttPxPerDay;

  const tierOneCount = Object.values(mergedScores).filter((score) => score.tier === 1).length;

  const topResidualRisks = Object.entries(residualPerMechanism)
    .filter(([, entry]) => entry.residual !== "low")
    .slice(0, 3)
    .map(([id]) => MECHANISMS.find((mech) => mech.id === id)?.name || id);

  const assumptionList = warnings
    .filter((warn) => warn.toLowerCase().includes("assum"))
    .slice(0, 3);
  const overrideAssumptions = testsWithAcceleration
    .filter((test) => test.acceleration.userOverrides.enabled)
    .map((test) => `${test.name} overrides`);
  const combinedAssumptions = [...assumptionList, ...overrideAssumptions].slice(0, 4);

  function handleSaveDraft() {
    saveWizardState(stateForSave);
    setSaveNotice("Draft saved.");
    window.setTimeout(() => setSaveNotice(""), 1500);
  }

  function handleReset() {
    clearWizardState();
    setState(createDefaultWizardState());
    setStep(1);
    setUserTouchedMechanisms(false);
  }

  function updateMechanism(id: string, updates: Partial<MechanismSelection>) {
    setUserTouchedMechanisms(true);
    setState((prev) => ({
      ...prev,
      mechanisms: prev.mechanisms.map((mech) => (mech.id === id ? { ...mech, ...updates } : mech)),
    }));
  }

  function handleGanttScroll(source: "left" | "right") {
    if (ganttSyncingRef.current) return;
    ganttSyncingRef.current = true;
    const left = ganttLeftRef.current;
    const right = ganttRightRef.current;
    if (source === "left" && left && right) {
      right.scrollTop = left.scrollTop;
    }
    if (source === "right" && left && right) {
      left.scrollTop = right.scrollTop;
    }
    window.setTimeout(() => {
      ganttSyncingRef.current = false;
    }, 0);
  }

  function handleFitToScreen() {
    const viewport = ganttRightRef.current;
    if (!viewport) return;
    const width = viewport.clientWidth;
    const next = Math.floor(width / Math.max(1, ganttTotalDays));
    setGanttPxPerDay(clampInt(String(next), ganttPxPerDay, 8, 40));
  }

  function handleZoom(delta: number) {
    setGanttPxPerDay((prev) => clampInt(String(prev + delta), prev, 8, 40));
  }

  function exportScheduleCsv() {
    const rows: Array<Array<string | number>> = [
      ["lane", "test", "startDay", "endDay", "durationDays", "dependencies"],
      ...ganttRender.lanes.flatMap((lane) =>
        lane.tasks.map((task) => [
          lane.lane,
          task.name,
          task.startDay + 1,
          task.endDay,
          task.durationDays,
          task.dependencies.join(" | "),
        ])
      ),
    ];
    downloadText("test-sequence.csv", buildCsv(rows), "text/csv");
  }

  async function copyScheduleSummary() {
    const lanesUsed = Object.values(scheduleStats.laneCounts).filter((count) => count > 0).length;
    const totalWeeks = Math.max(1, Math.ceil(scheduleStats.currentDays / 7));
    const summary = [
      `Total duration: ${scheduleStats.currentDays} days (~${totalWeeks} weeks)`,
      `Strategy: ${state.schedule.strategy}`,
      `Sequential: ${scheduleStats.sequentialDays} days`,
      `Current: ${scheduleStats.currentDays} days`,
      `Savings: ${scheduleStats.savingsPct}%`,
      `Tests: ${keptTests.length}`,
      `Lanes used: ${lanesUsed}`,
      `Critical lane: ${scheduleStats.criticalLane}`,
    ].join("\n");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary);
    }
  }

  function updateTest(id: string, updates: Partial<SelectedTest>) {
    setState((prev) => ({
      ...prev,
      selectedTests: prev.selectedTests.map((test) => (test.id === id ? { ...test, ...updates } : test)),
    }));
  }

  function updateAcceleration(
    id: string,
    updates: Partial<SelectedTest["acceleration"]>,
    overrideUpdates?: Partial<SelectedTest["acceleration"]["userOverrides"]>
  ) {
    setState((prev) => ({
      ...prev,
      selectedTests: prev.selectedTests.map((test) =>
        test.id === id
          ? {
              ...test,
              acceleration: {
                ...test.acceleration,
                ...updates,
                userOverrides: {
                  ...test.acceleration.userOverrides,
                  ...overrideUpdates,
                },
              },
            }
          : test
      ),
    }));
  }

  function updateStressProfile(id: string, updates: Partial<SelectedTest["stressProfile"]>) {
    setState((prev) => ({
      ...prev,
      selectedTests: prev.selectedTests.map((test) =>
        test.id === id ? { ...test, stressProfile: { ...test.stressProfile, ...updates } } : test
      ),
    }));
  }

  function openSpecModal(title: string, refs: Array<{ standard: string; clause?: string; note?: string }>) {
    if (!refs.length) return;
    setSpecModal({ title, refs });
  }

  function updateMaterialField(field: keyof WizardState["materials"], value: string) {
    setState((prev) => ({
      ...prev,
      materials: { ...prev.materials, [field]: value },
    }));
  }

  function updateFailureMode(id: string, updates: Partial<WizardState["failureModes"][string]>) {
    setUserTouchedMechanisms(true);
    setState((prev) => {
      const nextFailureModes = {
        ...prev.failureModes,
        [id]: { ...prev.failureModes[id], ...updates },
      };
      return {
        ...prev,
        failureModes: nextFailureModes,
        mechanisms: applyFailureModesToMechanisms(prev.mechanisms, nextFailureModes),
      };
    });
  }

  function updatePriorEvidence(testId: string, updates: Partial<WizardState["priorEvidence"][string]>) {
    setState((prev) => ({
      ...prev,
      priorEvidence: {
        ...prev.priorEvidence,
        [testId]: {
          ...prev.priorEvidence[testId],
          nPrev: prev.priorEvidence[testId]?.nPrev ?? null,
          fPrev: prev.priorEvidence[testId]?.fPrev ?? null,
          similarityPct: prev.priorEvidence[testId]?.similarityPct ?? 100,
          priorType: prev.priorEvidence[testId]?.priorType ?? "jeffreys",
          ...updates,
        },
      },
    }));
  }

  function updateDvprRow(id: string, updates: Partial<WizardState["dvpr"]["rows"][number]>) {
    setState((prev) => ({
      ...prev,
      dvpr: {
        rows: prev.dvpr.rows.map((row) => (row.id === id ? { ...row, ...updates } : row)),
      },
    }));
  }

  function exportJson() {
    downloadText(
      "reliability-test-plan.json",
      JSON.stringify(stateForSave, null, 2),
      "application/json"
    );
  }

  function exportCsv() {
    const rows: Array<Array<string | number | null>> = [
      [
        "testName",
        "mechanisms",
        "coverage",
        "durationWeeks",
        "tier",
        "af",
        "equivYears",
        "warnings",
        "justification",
      ],
    ];
    testsWithAcceleration.forEach((test) => {
      const tier = mergedScores[test.id]?.tier ?? "";
      rows.push([
        test.name,
        test.mechanismIds
          .map((id) => MECHANISMS.find((mech) => mech.id === id)?.name || id)
          .join("; "),
        test.coverage,
        test.durationWeeks,
        tier,
        test.acceleration?.af ?? "",
        test.acceleration?.equivYears ?? "",
        (test.acceleration?.warnings || []).join("; "),
        test.removalJustification || "",
      ]);
    });
    downloadText("reliability-tests.csv", buildCsv(rows), "text/csv;charset=utf-8");
  }

  function exportDvprJson() {
    downloadText("dvpr.json", JSON.stringify({ rows: state.dvpr.rows }, null, 2), "application/json");
  }

  function exportDvprCsv() {
    const rows: Array<Array<string | number | null>> = [
      [
        "requirement",
        "method",
        "testId",
        "specRefs",
        "conditions",
        "sampleSize",
        "durationValue",
        "durationUnit",
        "durationDays",
        "priorMeanPct",
        "priorUpper95Pct",
        "priorN",
        "priorF",
        "similarityPct",
        "badge",
        "acceptanceCriteria",
        "owner",
        "phase",
        "notes",
      ],
    ];
    state.dvpr.rows.forEach((row) => {
      const durationDays = row.duration.unit === "weeks" ? row.duration.value * 7 : row.duration.value;
      const priorMeanPct = row.risk?.priorMean !== undefined ? (row.risk.priorMean * 100).toFixed(2) : "";
      const priorUpper95Pct = row.risk?.priorUpper95 !== undefined ? (row.risk.priorUpper95 * 100).toFixed(2) : "";
      rows.push([
        row.requirement,
        row.validationMethod,
        row.testId ?? "",
        row.specRefs.map((ref) => ref.standard).join("; "),
        row.conditions,
        row.sampleSize ?? "",
        row.duration.value,
        row.duration.unit,
        durationDays,
        priorMeanPct,
        priorUpper95Pct,
        row.risk?.priorN ?? "",
        row.risk?.priorF ?? "",
        row.risk?.similarityPct ?? "",
        row.risk?.badge ?? "",
        row.acceptanceCriteria,
        row.owner,
        row.phase,
        row.notes ?? "",
      ]);
    });
    downloadText("dvpr.csv", buildCsv(rows), "text/csv;charset=utf-8");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {specModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Reference specs</div>
                <h3 className="text-lg font-semibold">{specModal.title}</h3>
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
                onClick={() => setSpecModal(null)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {specModal.refs.map((ref) => (
                <div key={`${specModal.title}-${ref.standard}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="font-semibold">{ref.standard}</div>
                  {ref.clause && <div className="text-xs text-slate-500">Clause: {ref.clause}</div>}
                  {ref.note && <div className="text-xs text-slate-500">Note: {ref.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Reliatools</div>
            <h1 className="text-2xl font-semibold">Reliability Test Architect</h1>
            <p className="text-sm text-slate-600">
              Build a defensible, step-by-step reliability test plan in minutes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-slate-300"
              onClick={handleSaveDraft}
            >
              Save Draft
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-slate-300"
              onClick={handleReset}
            >
              Reset
            </button>
            {saveNotice && <span className="text-xs text-emerald-600">{saveNotice}</span>}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl items-start gap-6 px-6 pb-14 pt-8 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <WizardStepper step={step} onStepChange={setStep} />
        </aside>

        <main className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Step {step}</div>
            <h2 className="text-xl font-semibold">{STEPS[step - 1]}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {step === 1 && "Define the product context to anchor the plan."}
              {step === 2 && "Capture mission profile details that drive stress conditions."}
              {step === 3 && "Confirm or exclude likely failure mechanisms."}
              {step === 4 && "Identify design changes that trigger additional tests."}
              {step === 5 && "Review candidate tests and set keep/downgrade/remove status."}
              {step === 6 && "Capture prior testing evidence to inform Bayesian risk."}
              {step === 7 && "Review acceleration factors and equivalence assumptions."}
              {step === 8 && "Assign S/L/D scores to prioritize the plan."}
              {step === 9 && "Document residual risk coverage and mitigations."}
              {step === 10 && "Review coverage score, gaps, and fixes before export."}
              {step === 11 && "Export a defensible summary and deliverables."}
            </p>
          </section>

          {step === 1 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Product type
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.product.productType}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        product: {
                          ...prev.product,
                          productType: event.target.value as WizardState["product"]["productType"],
                        },
                      }))
                    }
                  >
                    <option value="">Select a product type</option>
                    {productTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Industry
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.product.industry}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        product: {
                          ...prev.product,
                          industry: event.target.value as WizardState["product"]["industry"],
                        },
                      }))
                    }
                  >
                    <option value="">Select an industry</option>
                    {industryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Service life target (years)
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.product.serviceLifeYears ?? ""}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        product: {
                          ...prev.product,
                          serviceLifeYears: clampFloat(event.target.value, 0, 0, 50),
                        },
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Warranty (years)
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.product.warrantyYears ?? ""}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        product: {
                          ...prev.product,
                          warrantyYears: clampFloat(event.target.value, 0, 0, 30),
                        },
                      }))
                    }
                  />
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={state.product.safetyCritical}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        product: { ...prev.product, safetyCritical: event.target.checked },
                      }))
                    }
                  />
                  Safety critical system
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Temperature min (°C)
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.tempMinC ?? ""}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          tempMinC: clampFloat(event.target.value, 0, -60, 180),
                        },
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Temperature max (°C)
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.tempMaxC ?? ""}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          tempMaxC: clampFloat(event.target.value, 0, -40, 200),
                        },
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Thermal cycling frequency
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.thermalCycleFreq}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          thermalCycleFreq: event.target.value as WizardState["missionProfile"]["thermalCycleFreq"],
                        },
                      }))
                    }
                  >
                    <option value="rare">Rare</option>
                    <option value="daily">Daily</option>
                    <option value="power-cycling">Power cycling</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Humidity
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.humidity}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          humidity: event.target.value as WizardState["missionProfile"]["humidity"],
                        },
                      }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Humidity (%RH)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.humidityPct ?? ""}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          humidityPct: event.target.value === "" ? null : clampInt(event.target.value, 0, 0, 100),
                        },
                      }))
                    }
                  />
                  <span className="text-xs text-slate-500">
                    Controlled warehouse: 40–60%RH · Coastal: 70–90%RH · Condensing/rain prone: consider cycling + ingress tests
                  </span>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Humidity scenario
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.humidityScenario ?? ""}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          humidityScenario: event.target.value as WizardState["missionProfile"]["humidityScenario"],
                        },
                      }))
                    }
                  >
                    <option value="">Select a scenario</option>
                    <option value="controlled">Controlled indoor</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="coastal">Coastal</option>
                    <option value="condensing">Rain/Condensing</option>
                  </select>
                  <span className="text-xs text-slate-500">
                    Scenario guides test selection only; it does not change calculations.
                  </span>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Vibration
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.vibration}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          vibration: event.target.value as WizardState["missionProfile"]["vibration"],
                        },
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                  </select>
                </label>
                {state.missionProfile.humidityPct !== null &&
                  state.missionProfile.humidityPct > 80 &&
                  (state.missionProfile.chemicalExposure === "salt" || state.missionProfile.chemicalExposure === "mixed") && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      High corrosion risk: ensure humidity + chemical test coverage.
                    </div>
                  )}
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Shock
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.shock}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          shock: event.target.value as WizardState["missionProfile"]["shock"],
                        },
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="occasional">Occasional</option>
                    <option value="frequent">Frequent</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Chemical exposure
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.chemicalExposure}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          chemicalExposure: event.target.value as WizardState["missionProfile"]["chemicalExposure"],
                        },
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="salt">Salt</option>
                    <option value="oil">Oil</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Active duty (%)
                  <input
                    type="number"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={state.missionProfile.activeDutyPct ?? ""}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        missionProfile: {
                          ...prev.missionProfile,
                          activeDutyPct: clampInt(event.target.value, 0, 0, 100),
                        },
                      }))
                    }
                  />
                </label>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Mechanisms, materials, and failure modes</h3>
                  <p className="text-sm text-slate-500">
                    Use tabs to refine mechanisms, materials, and failure modes.
                  </p>
                </div>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                  onClick={() => {
                    setUserTouchedMechanisms(false);
                    setState((prev) => ({
                      ...prev,
                      mechanisms: syncMechanisms(prev.mechanisms, suggestedMechanisms),
                    }));
                  }}
                >
                  Re-apply suggestions
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                {[
                  { id: "mechanisms", label: "Mechanisms" },
                  { id: "materials", label: "Materials" },
                  { id: "failure-modes", label: "Failure Modes" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`rounded-full border px-3 py-1 transition ${
                      step3Tab === tab.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-500"
                    }`}
                    onClick={() => setStep3Tab(tab.id as typeof step3Tab)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {step3Tab === "mechanisms" && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {state.mechanisms.map((mechanism) => (
                    <MechanismCard
                      key={mechanism.id}
                      mechanism={mechanism}
                      onUpdate={updateMechanism}
                    />
                  ))}
                </div>
              )}

              {step3Tab === "materials" && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Housing material
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={state.materials.housingMaterialId ?? ""}
                      onChange={(event) => updateMaterialField("housingMaterialId", event.target.value)}
                    >
                      <option value="">Select housing material</option>
                      {(materialsByCategory.housing || []).map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Seal material
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={state.materials.sealMaterialId ?? ""}
                      onChange={(event) => updateMaterialField("sealMaterialId", event.target.value)}
                    >
                      <option value="">Select seal material</option>
                      {(materialsByCategory.seal || []).map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Contact material
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={state.materials.contactMaterialId ?? ""}
                      onChange={(event) => updateMaterialField("contactMaterialId", event.target.value)}
                    >
                      <option value="">Select contact material</option>
                      {(materialsByCategory.contact || []).map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Plating
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={state.materials.platingId ?? ""}
                      onChange={(event) => updateMaterialField("platingId", event.target.value)}
                    >
                      <option value="">Select plating</option>
                      {(materialsByCategory.plating || []).map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    PCB substrate
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={state.materials.pcbSubstrateId ?? ""}
                      onChange={(event) => updateMaterialField("pcbSubstrateId", event.target.value)}
                    >
                      <option value="">Select PCB substrate</option>
                      {(materialsByCategory.pcb || []).map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Solder alloy
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={state.materials.solderAlloyId ?? ""}
                      onChange={(event) => updateMaterialField("solderAlloyId", event.target.value)}
                    >
                      <option value="">Select solder alloy</option>
                      {(materialsByCategory.solder || []).map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="md:col-span-2 flex flex-col gap-2 text-sm font-medium">
                    Materials notes
                    <textarea
                      className="min-h-[90px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={state.materials.notes ?? ""}
                      onChange={(event) => updateMaterialField("notes", event.target.value)}
                      placeholder="Capture material-specific concerns or specs."
                    />
                  </label>
                </div>
              )}

              {step3Tab === "failure-modes" && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {FAILURE_MODE_LIBRARY.map((mode) => {
                    const selection = state.failureModes[mode.id];
                    return (
                      <div key={mode.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{mode.name}</div>
                            <div className="text-xs text-slate-500">{mode.description}</div>
                          </div>
                          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <input
                              type="checkbox"
                              checked={selection?.selected ?? false}
                              onChange={(event) => updateFailureMode(mode.id, { selected: event.target.checked })}
                            />
                            Include
                          </label>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          {([
                            { key: "severity", label: "S" },
                            { key: "occurrence", label: "O" },
                            { key: "detection", label: "D" },
                          ] as const).map((item) => (
                            <label key={item.key} className="flex flex-col gap-1">
                              <span className="font-semibold text-slate-500">{item.label}</span>
                              <input
                                type="number"
                                min={1}
                                max={5}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={selection?.[item.key] ?? 3}
                                onChange={(event) =>
                                  updateFailureMode(mode.id, {
                                    [item.key]: clampInt(event.target.value, 3, 1, 5),
                                  } as Partial<WizardState["failureModes"][string]>)
                                }
                              />
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          Mechanisms: {mode.mechanismIds.join(", ")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["newMaterial", "New material or resin system"],
                  ["newSupplier", "New supplier or supplier change"],
                  ["geometryChange", "Geometry or interface change"],
                  ["mountingRelocation", "Mounting or installation change"],
                  ["processChange", "Process or assembly change"],
                  ["deratingChange", "Derating update"],
                  ["costDownVariant", "Cost-down variant"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={state.changes[key as keyof WizardState["changes"]]}
                      onChange={(event) =>
                        setState((prev) => ({
                          ...prev,
                          changes: {
                            ...prev.changes,
                            [key]: event.target.checked,
                          },
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Candidate tests</h3>
                  <p className="text-sm text-slate-500">
                    Keep the tests that defend your mechanisms. Downgrade or remove with justification.
                  </p>
                </div>
                {(keepMissing || removalMissing) && (
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-amber-700">
                    {keepMissing && (
                      <span className="rounded-full bg-amber-100 px-3 py-1">
                        Keep at least one test to continue
                      </span>
                    )}
                    {removalMissing && (
                      <span className="rounded-full bg-amber-100 px-3 py-1">
                        Add justification for removed tests
                      </span>
                    )}
                  </div>
                )}
              </div>
              {humidityRequiresTest && !hasHumidityTestKept && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Humidity is specified at {state.missionProfile.humidityPct}%RH — add at least one humidity-based test
                  (constant exposure and/or cycling).
                </div>
              )}
              <div className="mt-4 space-y-3">
                {testsWithAcceleration.map((test) => (
                  <TestRow
                    key={test.id}
                    test={test}
                    onUpdate={updateTest}
                    onOpenSpecs={openSpecModal}
                  />
                ))}
                {testsWithAcceleration.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Select mechanisms or change triggers to populate tests.
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 6 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Prior evidence (Bayesian)</h3>
                  <p className="text-sm text-slate-500">
                    Evidence-based risk from prior similar testing; this does not replace validation requirements.
                  </p>
                </div>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                  onClick={() => {
                    const first = keptTests[0];
                    if (!first) return;
                    const seed = state.priorEvidence[first.id];
                    if (!seed) return;
                    keptTests.forEach((test) => {
                      updatePriorEvidence(test.id, seed);
                    });
                  }}
                >
                  Copy first row to all kept tests
                </button>
              </div>
              <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {[
                        "Test",
                        "Prior runs (n)",
                        "Prior failures (f)",
                        "Similarity (%)",
                        "Mean fail p",
                        "Upper 95% fail p",
                        "Risk",
                        "Copy",
                      ].map((header) => (
                        <th key={header} className="px-3 py-2 text-left">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {keptTests.map((test) => {
                      const prior = state.priorEvidence[test.id];
                      const computed = priorEvidenceMap[test.id];
                      const nPrev = prior?.nPrev ?? null;
                      const fPrev = prior?.fPrev ?? null;
                      const similarity = prior?.similarityPct ?? 100;
                      const fOver = nPrev !== null && fPrev !== null && fPrev > nPrev;
                      const meanPct =
                        computed?.meanFailProb !== undefined
                          ? `${(computed.meanFailProb * 100).toFixed(2)}%`
                          : "—";
                      const upperPct =
                        computed?.upperFailProb95 !== undefined
                          ? `${(computed.upperFailProb95 * 100).toFixed(2)}%`
                          : "—";
                      const badge = computed?.badge ?? "None";
                      return (
                        <tr key={test.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium">{test.name}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              value={nPrev ?? ""}
                              onChange={(event) => {
                                const next = event.target.value === "" ? null : clampInt(event.target.value, 0, 0, 100000);
                                const cappedF =
                                  next === null || fPrev === null ? fPrev : Math.min(fPrev, next);
                                updatePriorEvidence(test.id, {
                                  nPrev: next,
                                  fPrev: cappedF,
                                });
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className={`w-20 rounded-lg border px-2 py-1 text-sm ${
                                fOver ? "border-amber-400 bg-amber-50" : "border-slate-200"
                              }`}
                              value={fPrev ?? ""}
                              onChange={(event) => {
                                const next = event.target.value === "" ? null : clampInt(event.target.value, 0, 0, 100000);
                                const capped = nPrev !== null && next !== null ? Math.min(next, nPrev) : next;
                                updatePriorEvidence(test.id, { fPrev: capped });
                              }}
                            />
                            {fOver && (
                              <div className="mt-1 text-[11px] text-amber-700">Failures clamped to n.</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              className="w-32"
                              value={similarity}
                              onChange={(event) =>
                                updatePriorEvidence(test.id, { similarityPct: clampInt(event.target.value, 100, 0, 100) })
                              }
                            />
                            <div className="text-[11px] text-slate-500">{similarity}%</div>
                            <select
                              className="mt-1 w-28 rounded-md border border-slate-200 px-2 py-1 text-[11px]"
                              value={prior?.priorType ?? "jeffreys"}
                              onChange={(event) =>
                                updatePriorEvidence(test.id, { priorType: event.target.value as "jeffreys" | "uniform" })
                              }
                            >
                              <option value="jeffreys">Jeffreys</option>
                              <option value="uniform">Uniform</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">{meanPct}</td>
                          <td className="px-3 py-2">{upperPct}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                badge === "Low"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : badge === "Med"
                                    ? "bg-amber-100 text-amber-700"
                                    : badge === "High"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {badge}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                              onClick={() => {
                                const source = state.priorEvidence[test.id];
                                if (!source) return;
                                keptTests.forEach((item) => {
                                  updatePriorEvidence(item.id, source);
                                });
                              }}
                            >
                              Copy to all
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {keptTests.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                          Keep at least one test to record prior evidence.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {step === 7 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Acceleration review</h3>
                  <p className="text-sm text-slate-500">
                    Transparent placeholders for acceleration and equivalence.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {activeTests.map((test) => (
                  <div key={test.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{test.name}</div>
                        <div className="text-xs text-slate-500">
                          Model: {test.acceleration.model} · AF {test.acceleration.af ?? "--"}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold">{test.acceleration.equivYears ?? "--"} years equiv.</div>
                        <div className="text-xs text-slate-500">{test.durationWeeks} weeks planned</div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stress profile</div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <label className="flex flex-col gap-1">
                            Temp low (C)
                            <input
                              type="number"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              value={test.stressProfile.tempLowC ?? ""}
                              onChange={(event) =>
                                updateStressProfile(test.id, { tempLowC: clampFloat(event.target.value, 0, -60, 200) })
                              }
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            Temp high (C)
                            <input
                              type="number"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              value={test.stressProfile.tempHighC ?? ""}
                              onChange={(event) =>
                                updateStressProfile(test.id, { tempHighC: clampFloat(event.target.value, 0, -40, 220) })
                              }
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            Humidity (%)
                            <input
                              type="number"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              value={test.stressProfile.humidityPct ?? ""}
                              onChange={(event) =>
                                updateStressProfile(test.id, { humidityPct: clampFloat(event.target.value, 0, 0, 100) })
                              }
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            Electrical load notes
                            <input
                              type="text"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              value={test.stressProfile.electricalLoadNote ?? ""}
                              onChange={(event) => updateStressProfile(test.id, { electricalLoadNote: event.target.value })}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assumptions</div>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <input
                              type="checkbox"
                              checked={test.acceleration.userOverrides.enabled}
                              onChange={(event) =>
                                updateAcceleration(test.id, {}, { enabled: event.target.checked })
                              }
                            />
                            Override
                          </label>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {([
                            { key: "TuseK", label: "Tuse (K)", min: 200, max: 600 },
                            { key: "TstressK", label: "Tstress (K)", min: 200, max: 700 },
                            { key: "deltaTuse", label: "Delta Tuse", min: 1, max: 200 },
                            { key: "deltaTstress", label: "Delta Tstress", min: 1, max: 250 },
                            { key: "RHuse", label: "RHuse (%)", min: 1, max: 100 },
                            { key: "RHstress", label: "RHstress (%)", min: 1, max: 100 },
                            { key: "Ea", label: "Ea (eV)", min: 0.1, max: 2.5 },
                            { key: "n", label: "n", min: 0.1, max: 6 },
                            { key: "m", label: "m", min: 0.1, max: 6 },
                          ] as const).map((field) => (
                            <label key={field.key} className="flex flex-col gap-1">
                              {field.label}
                              <input
                                type="number"
                                className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-100"
                                disabled={!test.acceleration.userOverrides.enabled}
                                value={test.acceleration.userOverrides[field.key] ?? ""}
                                onChange={(event) =>
                                  updateAcceleration(
                                    test.id,
                                    {},
                                    {
                                      [field.key]: clampFloat(event.target.value, 0, field.min, field.max),
                                    } as Partial<SelectedTest["acceleration"]["userOverrides"]>
                                  )
                                }
                              />
                            </label>
                          ))}
                          <label className="col-span-2 flex flex-col gap-1">
                            Override notes
                            <input
                              type="text"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-100"
                              disabled={!test.acceleration.userOverrides.enabled}
                              value={test.acceleration.userOverrides.notes ?? ""}
                              onChange={(event) => updateAcceleration(test.id, {}, { notes: event.target.value })}
                            />
                          </label>
                        </div>
                        {!test.acceleration.userOverrides.enabled && (
                          <div className="mt-2 text-xs text-slate-500">
                            Enable override to customize assumed stress parameters.
                          </div>
                        )}
                        {state.materials.housingMaterialId && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {(() => {
                              const material = MATERIAL_LIBRARY.find(
                                (entry) => entry.id === state.materials.housingMaterialId
                              );
                              const suggestion = getEaSuggestion(material);
                              if (suggestion.kind === "range") {
                                const midpoint = (suggestion.min + suggestion.max) / 2;
                                return (
                                  <>
                                    <button
                                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600"
                                      onClick={() => updateAcceleration(test.id, {}, { Ea: suggestion.min, enabled: true })}
                                    >
                                      Use Ea min ({suggestion.min})
                                    </button>
                                    <button
                                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600"
                                      onClick={() => updateAcceleration(test.id, {}, { Ea: suggestion.max, enabled: true })}
                                    >
                                      Use Ea max ({suggestion.max})
                                    </button>
                                    <button
                                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600"
                                      onClick={() =>
                                        updateAcceleration(test.id, {}, { Ea: Number(midpoint.toFixed(2)), enabled: true })
                                      }
                                    >
                                      Use Ea midpoint ({midpoint.toFixed(2)})
                                    </button>
                                  </>
                                );
                              }
                              if (suggestion.kind === "default") {
                                return (
                                  <button
                                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600"
                                    onClick={() => updateAcceleration(test.id, {}, { Ea: suggestion.value, enabled: true })}
                                  >
                                    Use Ea default ({suggestion.value})
                                  </button>
                                );
                              }
                              return <span className="text-slate-400">No Ea suggestion available</span>;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    {test.acceleration.warnings.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-amber-700">
                        {test.acceleration.warnings.map((warn) => (
                          <li key={warn}>• {warn}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {activeTests.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Keep at least one test to generate acceleration summaries.
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 8 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Risk prioritization</h3>
                  <p className="text-sm text-slate-500">Adjust S/L/D scores to align to program risk.</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reliability demonstration plan
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Target reliability (R)
                    <input
                      type="number"
                      step="0.0001"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={state.reliabilityPlan.targetReliability}
                      onChange={(event) =>
                        setState((prev) => ({
                          ...prev,
                          reliabilityPlan: {
                            ...prev.reliabilityPlan,
                            targetReliability: clampFloat(event.target.value, prev.reliabilityPlan.targetReliability, 0.5, 0.99999),
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Confidence (CL)
                    <input
                      type="number"
                      step="0.0001"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={state.reliabilityPlan.confidence}
                      onChange={(event) =>
                        setState((prev) => ({
                          ...prev,
                          reliabilityPlan: {
                            ...prev.reliabilityPlan,
                            confidence: clampFloat(event.target.value, prev.reliabilityPlan.confidence, 0.5, 0.99999),
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Allowed failures (c)
                    <input
                      type="number"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={state.reliabilityPlan.allowedFailures}
                      onChange={(event) =>
                        setState((prev) => ({
                          ...prev,
                          reliabilityPlan: {
                            ...prev.reliabilityPlan,
                            allowedFailures: clampInt(event.target.value, prev.reliabilityPlan.allowedFailures, 0, 20),
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Method
                    <select
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={state.reliabilityPlan.method}
                      onChange={(event) =>
                        setState((prev) => ({
                          ...prev,
                          reliabilityPlan: {
                            ...prev.reliabilityPlan,
                            method: event.target.value as WizardState["reliabilityPlan"]["method"],
                          },
                        }))
                      }
                    >
                      <option value="binomial">Binomial</option>
                      <option value="weibull-basic">Weibull (basic)</option>
                    </select>
                  </label>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    Required sample size: <span className="font-semibold">{requiredSampleSize}</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    Tier 1: {requiredSampleSize} · Tier 2: {Math.max(6, Math.ceil(requiredSampleSize * 0.5))} ·
                    Tier 3: {Math.max(3, Math.ceil(requiredSampleSize * 0.25))}
                  </div>
                </div>
              </div>
              <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Test</th>
                      <th className="px-3 py-2 text-center">S</th>
                      <th className="px-3 py-2 text-center">L</th>
                      <th className="px-3 py-2 text-center">D</th>
                      <th className="px-3 py-2 text-center">Sample</th>
                      <th className="px-3 py-2 text-center">Score</th>
                      <th className="px-3 py-2 text-center">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTests.map((test) => {
                      const score = mergedScores[test.id];
                      const recommendedSample =
                        score?.tier === 1
                          ? requiredSampleSize
                          : score?.tier === 2
                            ? Math.max(6, Math.ceil(requiredSampleSize * 0.5))
                            : Math.max(3, Math.ceil(requiredSampleSize * 0.25));
                      return (
                        <tr key={test.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium">{test.name}</td>
                          {(["severity", "likelihood", "detectability"] as const).map((field) => (
                            <td key={field} className="px-3 py-2 text-center">
                              <input
                                type="number"
                                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm"
                                min={1}
                                max={5}
                                value={score?.[field] ?? 3}
                                onChange={(event) =>
                                  setState((prev) => ({
                                    ...prev,
                                    prioritization: {
                                      testScores: {
                                        ...prev.prioritization.testScores,
                                        [test.id]: {
                                          ...score,
                                          [field]: clampInt(event.target.value, score?.[field] ?? 3, 1, 5),
                                          score: 0,
                                          tier: 3,
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm"
                              value={test.sampleSizeOverride ?? recommendedSample}
                              onChange={(event) =>
                                updateTest(test.id, {
                                  sampleSizeOverride: clampInt(event.target.value, recommendedSample, 1, 5000),
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">{score?.score ?? "--"}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                score?.tier === 1
                                  ? "bg-rose-100 text-rose-700"
                                  : score?.tier === 2
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              Tier {score?.tier ?? "--"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {step === 9 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4">
                {state.mechanisms.map((mechanism) => {
                  const entry = residualPerMechanism[mechanism.id];
                  return (
                    <div key={mechanism.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{mechanism.name}</div>
                          <div className="text-xs text-slate-500">
                            Covered: {entry.covered} · Residual: {entry.residual}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {mitigationTags.map((tag) => {
                            const active = entry.mitigations.includes(tag);
                            return (
                              <button
                                key={tag}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                  active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"
                                }`}
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    residualRisk: {
                                      perMechanism: {
                                        ...prev.residualRisk.perMechanism,
                                        [mechanism.id]: {
                                          ...entry,
                                          mitigations: active
                                            ? entry.mitigations.filter((item) => item !== tag)
                                            : [...entry.mitigations, tag],
                                        },
                                      },
                                    },
                                  }))
                                }
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {step === 10 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coverage Score</div>
                  <div className="mt-2 text-3xl font-semibold">{coverageScore}</div>
                  <div
                    className={`mt-1 text-sm font-semibold ${
                      coverageScore >= 80
                        ? "text-emerald-600"
                        : coverageScore >= 60
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  >
                    {coverageScore >= 80 ? "Green: Strong coverage" : coverageScore >= 60 ? "Amber: Moderate gaps" : "Red: Major gaps"}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Score reflects completeness, mapping strength, and validity of assumptions.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fix list</div>
                  <div className="mt-3 space-y-2">
                    {coverageBreakdown.fixList.length === 0 && (
                      <div className="text-xs text-slate-500">No high-impact fixes identified.</div>
                    )}
                    {coverageBreakdown.fixList.slice(0, 6).map((item) => (
                      <button
                        key={`${item.title}-${item.stepIndexToFix}`}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                        onClick={() => setStep(item.stepIndexToFix)}
                      >
                        <span>{item.title}</span>
                        <span className="text-[11px] text-slate-500">+{item.pointsGainEstimate} pts</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {["Area", "Points", "Status", "Missing", "Action"].map((header) => (
                        <th key={header} className="px-3 py-2 text-left">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coverageBreakdown.rows.map((row) => (
                      <tr key={row.area} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">{row.area}</td>
                        <td className="px-3 py-2">
                          {row.pointsEarned} / {row.pointsMax}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              row.status === "Good"
                                ? "bg-emerald-100 text-emerald-700"
                                : row.status === "Partial"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {row.missing.length ? row.missing.join(", ") : "None"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                            onClick={() => setStep(row.stepIndexToFix)}
                          >
                            Go fix
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {step === 11 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CEO skim</div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <div>Tier 1 tests: {tierOneCount}</div>
                  <div>Tier 1 sample size: {state.reliabilityPlan.requiredSampleSize ?? requiredSampleSize}</div>
                  <div>
                    Total duration: {Math.max(1, Math.ceil(scheduleStats.currentDays / 7))} weeks ({state.schedule.strategy})
                  </div>
                  <div>Top residual risks: {topResidualRisks.join(", ") || "None flagged"}</div>
                  <div>Assumptions: {combinedAssumptions.join(" · ") || "None"}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <ExportCard
                  title="Download JSON"
                  description="Full wizard state for audit trail or reuse."
                  actionLabel="Download JSON"
                  onClick={exportJson}
                />
                <ExportCard
                  title="Download CSV (tests)"
                  description="Test-level export with coverage, tiers, and acceleration notes."
                  actionLabel="Download CSV"
                  onClick={exportCsv}
                />
                <ExportCard
                  title="PDF Summary"
                  description="Executive-ready report format."
                  actionLabel="Coming soon"
                  disabled
                />
                <ExportCard
                  title="Excel Workbook"
                  description="Editable sheets for DVP&R and risk tracking."
                  actionLabel="Coming soon"
                  disabled
                />
              </div>

            </section>
          )}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              disabled={step === 1}
            >
              Back
            </button>
            <div className="text-xs text-slate-500">
              Step {step} of {STEPS.length}
            </div>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => step < STEPS.length && stepValid && setStep((prev) => prev + 1)}
              disabled={!stepValid || step === STEPS.length}
            >
              Next
            </button>
          </div>
        </main>

        <aside className="space-y-4">
          <RightPanelSummary
            productName={
              productTypeOptions.find((option) => option.value === state.product.productType)?.label ||
              "Unspecified product"
            }
            serviceLife={state.product.serviceLifeYears ?? 0}
            selectedMechanisms={state.mechanisms.filter((mechanism) => mechanism.selected).length}
            keptTests={keptTests.length}
            totalTests={testsWithAcceleration.length}
            warnings={warnings}
            coverageScore={coverageScore}
          />
        </aside>

        {step === 11 && (
          <section className="lg:col-start-1 lg:col-span-3 space-y-8">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">DVP&R preview</h4>
                  <p className="text-xs text-slate-500">Edit rows as needed before export.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                    onClick={exportDvprCsv}
                  >
                    Download CSV
                  </button>
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                    onClick={exportDvprJson}
                  >
                    Download JSON
                  </button>
                </div>
              </div>
              <div className="mt-4 w-full overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      {[
                        "Requirement",
                        "Method",
                        "Test",
                        "Spec refs",
                        "Conditions",
                        "Sample",
                        "Duration",
                        "Prior Evidence Risk",
                        "Acceptance",
                        "Owner",
                        "Phase",
                      ].map((header) => (
                        <th key={header} className="px-3 py-2 text-left">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.dvpr.rows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <input
                            className="w-64 rounded-md border border-slate-200 px-2 py-1 text-xs"
                            value={row.requirement}
                            onChange={(event) => updateDvprRow(row.id, { requirement: event.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                            value={row.validationMethod}
                            onChange={(event) =>
                              updateDvprRow(row.id, { validationMethod: event.target.value as "Test" | "Analysis" | "Inspection" })
                            }
                          >
                            <option value="Test">Test</option>
                            <option value="Analysis">Analysis</option>
                            <option value="Inspection">Inspection</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-xs">{row.testId ?? "--"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {row.specRefs.map((ref) => (
                              <button
                                key={`${row.id}-${ref.standard}`}
                                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                                onClick={() => openSpecModal(row.requirement, row.specRefs)}
                              >
                                {ref.standard}
                              </button>
                            ))}
                          </div>
                          <input
                            className="mt-2 w-40 rounded-md border border-slate-200 px-2 py-1 text-[11px]"
                            value={row.specRefs.map((ref) => ref.standard).join(", ")}
                            onChange={(event) =>
                              updateDvprRow(row.id, {
                                specRefs: event.target.value
                                  .split(",")
                                  .map((value) => value.trim())
                                  .filter(Boolean)
                                  .map((standard) => ({ standard })),
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-48 rounded-md border border-slate-200 px-2 py-1 text-xs"
                            value={row.conditions}
                            onChange={(event) => updateDvprRow(row.id, { conditions: event.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs"
                            value={row.sampleSize ?? ""}
                            onChange={(event) =>
                              updateDvprRow(row.id, { sampleSize: clampInt(event.target.value, 0, 0, 5000) })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs"
                              value={row.duration.value}
                              onChange={(event) =>
                                updateDvprRow(row.id, {
                                  duration: {
                                    ...row.duration,
                                    value: clampInt(event.target.value, row.duration.value, 1, 3650),
                                  },
                                })
                              }
                            />
                            <select
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                              value={row.duration.unit}
                              onChange={(event) => {
                                const currentDays =
                                  row.duration.unit === "weeks" ? row.duration.value * 7 : row.duration.value;
                                const nextUnit = event.target.value as "days" | "weeks";
                                const nextValue =
                                  nextUnit === "weeks"
                                    ? Math.max(1, Math.round(currentDays / 7))
                                    : Math.max(1, Math.round(currentDays));
                                updateDvprRow(row.id, {
                                  duration: {
                                    value: nextValue,
                                    unit: nextUnit,
                                  },
                                });
                              }}
                            >
                              <option value="days">days</option>
                              <option value="weeks">weeks</option>
                            </select>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Equivalent: {row.duration.unit === "weeks" ? row.duration.value * 7 : row.duration.value} days
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {row.risk?.badge && row.risk.badge !== "None" ? (
                            <div className="space-y-1">
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                  row.risk.badge === "Low"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : row.risk.badge === "Med"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {row.risk.badge}
                              </span>
                              <div className="text-[11px] text-slate-600">
                                Mean {row.risk.priorMean !== undefined ? `${(row.risk.priorMean * 100).toFixed(2)}%` : "—"}
                                {" | "}
                                95% ≤{" "}
                                {row.risk.priorUpper95 !== undefined ? `${(row.risk.priorUpper95 * 100).toFixed(2)}%` : "—"}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                n={row.risk.priorN ?? 0}, f={row.risk.priorF ?? 0}, sim={row.risk.similarityPct ?? 100}%
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-56 rounded-md border border-slate-200 px-2 py-1 text-xs"
                            value={row.acceptanceCriteria}
                            onChange={(event) => updateDvprRow(row.id, { acceptanceCriteria: event.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-32 rounded-md border border-slate-200 px-2 py-1 text-xs"
                            value={row.owner}
                            onChange={(event) => updateDvprRow(row.id, { owner: event.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                            value={row.phase}
                            onChange={(event) =>
                              updateDvprRow(row.id, { phase: event.target.value as "DV" | "PV" | "PQ" })
                            }
                          >
                            <option value="DV">DV</option>
                            <option value="PV">PV</option>
                            <option value="PQ">PQ</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Test sequence</h4>
                  <p className="text-xs text-slate-500">Planning-grade Gantt view with lanes, dependencies, and zoom.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide">
                  <label className="flex items-center gap-2 text-[11px] text-slate-500 normal-case">
                    Start date
                    <input
                      type="date"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
                      value={state.schedule.startDateISO ?? ""}
                      onChange={(event) =>
                        setState((prev) => ({
                          ...prev,
                          schedule: { ...prev.schedule, startDateISO: event.target.value },
                        }))
                      }
                    />
                  </label>
                  {[
                    { id: "sequential", label: "Sequential" },
                    { id: "parallel-by-stressor", label: "Parallel by stressor" },
                    { id: "parallel-max", label: "Parallel max" },
                  ].map((strategy) => (
                    <button
                      key={strategy.id}
                      className={`rounded-full border px-3 py-1 ${
                        state.schedule.strategy === strategy.id
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 text-slate-500"
                      }`}
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          schedule: { ...prev.schedule, strategy: strategy.id as WizardState["schedule"]["strategy"] },
                        }))
                      }
                    >
                      {strategy.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 md:grid-cols-2 lg:grid-cols-5">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Total duration</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {scheduleStats.currentDays} days (~{Math.max(1, Math.ceil(scheduleStats.currentDays / 7))} weeks)
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Parallel efficiency</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {scheduleStats.savingsPct}% savings
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Seq {scheduleStats.sequentialDays}d → Now {scheduleStats.currentDays}d
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Tests / lanes</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {keptTests.length} tests · {Object.values(scheduleStats.laneCounts).filter((count) => count > 0).length} lanes
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Critical lane</div>
                  <div className="text-sm font-semibold text-slate-800">{scheduleStats.criticalLane}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600"
                    onClick={copyScheduleSummary}
                  >
                    Copy summary as text
                  </button>
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600"
                    onClick={exportScheduleCsv}
                  >
                    Download schedule CSV
                  </button>
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-300"
                    disabled
                    title="Coming soon"
                  >
                    Download PNG (coming soon)
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div className="flex items-center gap-2">
                  {(["weeks", "days"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`rounded-full border px-3 py-1 ${
                        ganttView === mode ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-500"
                      }`}
                      onClick={() => setGanttView(mode)}
                    >
                      {mode === "weeks" ? "Weeks" : "Days"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-600"
                    onClick={() => handleZoom(-4)}
                  >
                    Zoom –
                  </button>
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-600"
                    onClick={() => handleZoom(4)}
                  >
                    Zoom +
                  </button>
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-600"
                    onClick={handleFitToScreen}
                  >
                    Fit to screen
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-[260px_minmax(0,1fr)]">
                  <div className="border-r border-slate-200">
                    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Task list
                    </div>
                    <div
                      ref={ganttLeftRef}
                      className="max-h-[520px] overflow-y-auto"
                      onScroll={() => handleGanttScroll("left")}
                    >
                      {ganttRender.lanes.map((lane) => {
                        const taskRows = lane.tasks.length > 0 ? lane.tasks : [null];
                        return (
                          <div key={lane.lane} className="border-b border-slate-200">
                            <div className="flex h-8 items-center bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                              {lane.lane}
                            </div>
                            <div className="space-y-2 px-3 py-3">
                              {taskRows.map((task, index) => (
                                <div key={task?.id ?? `${lane.lane}-empty-${index}`} className="h-7 text-sm text-slate-700">
                                  {task ? task.name : <span className="text-xs text-slate-400">No tests</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                      <div className="flex">
                        <div className="w-full overflow-hidden px-2">
                          <div
                            className="relative h-8"
                            style={{ width: Math.max(ganttTimelineWidth, 600) }}
                          >
                            {ganttView === "weeks" &&
                              Array.from({ length: ganttWeekCount }).map((_, index) => (
                                <div
                                  key={`week-${index}`}
                                  className="absolute top-1 text-[10px] text-slate-400"
                                  style={{ left: index * 7 * ganttPxPerDay }}
                                >
                                  W{index + 1}
                                </div>
                              ))}
                            {ganttView === "days" &&
                              Array.from({ length: ganttTotalDays }).map((_, index) => {
                                const dayLabel = index + 1;
                                if (dayLabel % 5 !== 0) return null;
                                return (
                                  <div
                                    key={`day-${dayLabel}`}
                                    className="absolute top-1 text-[10px] text-slate-400"
                                    style={{ left: index * ganttPxPerDay }}
                                  >
                                    D{dayLabel}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      ref={ganttRightRef}
                      className="max-h-[520px] overflow-auto"
                      onScroll={() => handleGanttScroll("right")}
                    >
                      <div
                        ref={ganttTimelineRef}
                        className="relative"
                        style={{
                          width: Math.max(ganttTimelineWidth, 600),
                          backgroundImage: `repeating-linear-gradient(to right, rgba(226,232,240,0.8) 0, rgba(226,232,240,0.8) 1px, transparent 1px, transparent ${ganttTickWidth}px)`,
                        }}
                      >
                        {ganttRender.lanes.map((lane) => {
                          const taskRows = lane.tasks.length > 0 ? lane.tasks : [null];
                          return (
                            <div key={lane.lane} className="border-b border-slate-200">
                              <div className="h-8" />
                              <div className="space-y-2 px-2 py-3">
                                {taskRows.map((task, index) => {
                                  if (!task) {
                                    return <div key={`${lane.lane}-empty-${index}`} className="h-7" />;
                                  }
                                  const left = task.startDay * ganttPxPerDay;
                                  const width = Math.max(ganttPxPerDay, task.durationDays * ganttPxPerDay);
                                  const durationLabel =
                                    ganttView === "weeks"
                                      ? `${Math.max(1, Math.ceil(task.durationDays / 7))}w`
                                      : `${task.durationDays}d`;
                                  const startDisplay = ganttView === "weeks" ? `W${task.startWeek}` : `D${task.startDay + 1}`;
                                  const endDisplay = ganttView === "weeks" ? `W${task.endWeek}` : `D${task.endDay}`;
                                  const tooltipParts = [
                                    task.name,
                                    `Lane: ${lane.lane}`,
                                    `Duration: ${task.durationDays} days`,
                                    `Start: ${startDisplay}`,
                                    `End: ${endDisplay}`,
                                  ];
                                  if (scheduleStartDate) {
                                    const startDate = new Date(scheduleStartDate);
                                    startDate.setDate(startDate.getDate() + task.startDay);
                                    const endDate = new Date(scheduleStartDate);
                                    endDate.setDate(endDate.getDate() + Math.max(0, task.endDay - 1));
                                    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
                                    tooltipParts.push(`Dates: ${formatter.format(startDate)} - ${formatter.format(endDate)}`);
                                  }
                                  if (task.dependencies.length) {
                                    tooltipParts.push(`Depends on: ${task.dependencies.join(", ")}`);
                                  }
                                  const laneColor =
                                    lane.lane === "Thermal"
                                      ? "bg-rose-200 border-rose-400 text-rose-900"
                                      : lane.lane === "Humidity"
                                        ? "bg-sky-200 border-sky-400 text-sky-900"
                                        : lane.lane === "Vibration"
                                          ? "bg-amber-200 border-amber-400 text-amber-900"
                                          : lane.lane === "Mechanical"
                                            ? "bg-slate-200 border-slate-400 text-slate-900"
                                            : "bg-emerald-200 border-emerald-400 text-emerald-900";
                                  return (
                                    <div key={task.id} className="relative h-7">
                                      {task.dependsOnTaskIds.length > 0 && (
                                        <>
                                          <div
                                            className="absolute top-1/2 h-px border-t border-dashed border-slate-300"
                                            style={{ left: 0, width: Math.max(0, left) }}
                                          />
                                          <div
                                            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-slate-400"
                                            style={{ left: Math.max(0, left - 4) }}
                                          />
                                        </>
                                      )}
                                      <div
                                        className={`absolute flex h-7 items-center gap-2 overflow-hidden rounded-md border px-2 text-[11px] font-semibold ${laneColor}`}
                                        style={{ left, width }}
                                        title={tooltipParts.join("\n")}
                                      >
                                        <span className="truncate">{task.name}</span>
                                        <span className="ml-auto text-[10px] font-semibold">{durationLabel}</span>
                                        {task.tier && (
                                          <span className="rounded-full border border-slate-400 px-2 py-0.5 text-[10px] text-slate-800">
                                            T{task.tier}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function WizardStepper({
  step,
  onStepChange,
}: {
  step: number;
  onStepChange: (next: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Steps</div>
      <div className="space-y-2">
        {STEPS.map((label, index) => {
          const current = index + 1;
          const active = current === step;
          return (
            <button
              key={label}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              onClick={() => onStepChange(current)}
            >
              <div className="text-xs uppercase tracking-wide text-slate-400">Step {current}</div>
              <div className="font-medium">{label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MechanismCard({
  mechanism,
  onUpdate,
}: {
  mechanism: MechanismSelection;
  onUpdate: (id: string, updates: Partial<MechanismSelection>) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{mechanism.name}</div>
          <div className="text-xs text-slate-500">Confidence: {mechanism.confidence}</div>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <input
            type="checkbox"
            checked={mechanism.selected}
            onChange={(event) =>
              onUpdate(mechanism.id, {
                selected: event.target.checked,
                exclusionJustification: event.target.checked ? null : "",
              })
            }
          />
          Include
        </label>
      </div>
      <div className="mt-3">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Confidence
          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
            value={mechanism.confidence}
            onChange={(event) =>
              onUpdate(mechanism.id, { confidence: event.target.value as MechanismSelection["confidence"] })
            }
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="assumed">Assumed</option>
          </select>
        </label>
      </div>
      {!mechanism.selected && (
        <div className="mt-3">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Exclusion justification
            <textarea
              className="min-h-[80px] rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700"
              value={mechanism.exclusionJustification ?? ""}
              onChange={(event) =>
                onUpdate(mechanism.id, { exclusionJustification: event.target.value })
              }
              placeholder="Explain why this mechanism is excluded."
            />
          </label>
        </div>
      )}
    </div>
  );
}

function TestRow({
  test,
  onUpdate,
  onOpenSpecs,
}: {
  test: SelectedTest;
  onUpdate: (id: string, updates: Partial<SelectedTest>) => void;
  onOpenSpecs: (title: string, refs: Array<{ standard: string; clause?: string; note?: string }>) => void;
}) {
  const needsJustification = test.status === "remove" && !test.removalJustification?.trim();
  const definition = TESTS.find((item) => item.id === test.id);
  const refs = definition?.references ?? [];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{test.name}</div>
          <div className="text-xs text-slate-500">
            Coverage: {test.coverage} · {test.durationWeeks} weeks · Cost level {test.costLevel}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          {(["keep", "downgrade", "remove"] as const).map((status) => (
            <button
              key={status}
              className={`rounded-full border px-3 py-1 uppercase tracking-wide ${
                test.status === status ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"
              }`}
              onClick={() => onUpdate(test.id, { status })}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        {test.mechanismIds.length > 0
          ? test.mechanismIds.map((id) => (
              <span key={id} className="rounded-full border border-slate-200 bg-white px-2 py-1">
                {MECHANISMS.find((mech) => mech.id === id)?.name || id}
              </span>
            ))
          : "Change-triggered test"}
      </div>
      {refs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {refs.map((ref) => (
            <button
              key={`${test.id}-${ref.standard}`}
              className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:border-slate-300"
              onClick={() => onOpenSpecs(test.name, refs)}
            >
              {ref.standard}
            </button>
          ))}
        </div>
      )}
      {test.status === "remove" && (
        <div className="mt-3">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Removal justification
            <textarea
              className={`min-h-[70px] rounded-lg border px-2 py-2 text-sm text-slate-700 ${
                needsJustification ? "border-amber-400 bg-amber-50" : "border-slate-200"
              }`}
              value={test.removalJustification ?? ""}
              onChange={(event) => onUpdate(test.id, { removalJustification: event.target.value })}
              placeholder="Why is this test removed?"
            />
          </label>
          {needsJustification && (
            <div className="mt-2 text-xs font-semibold text-amber-700">Justification required.</div>
          )}
        </div>
      )}
    </div>
  );
}

function RightPanelSummary({
  productName,
  serviceLife,
  selectedMechanisms,
  keptTests,
  totalTests,
  warnings,
  coverageScore,
}: {
  productName: string;
  serviceLife: number;
  selectedMechanisms: number;
  keptTests: number;
  totalTests: number;
  warnings: string[];
  coverageScore: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-400">Context</div>
      <div className="mt-2 text-sm font-semibold">{productName}</div>
      <div className="text-xs text-slate-500">Service life: {serviceLife || "--"} years</div>
      <div className="mt-4 grid gap-2 text-sm">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          Mechanisms selected: {selectedMechanisms}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          Tests kept: {keptTests} / {totalTests}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-xs uppercase tracking-wide text-slate-400">Warnings</div>
        {warnings.length === 0 && <div className="text-xs text-slate-500">No warnings flagged.</div>}
        {warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-amber-700">
            {warnings.slice(0, 6).map((warn) => (
              <li key={warn}>• {warn}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4">
        <div className="text-xs uppercase tracking-wide text-slate-400">Coverage Score</div>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-slate-900"
            style={{ width: `${coverageScore}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-500">{coverageScore}% coverage</div>
      </div>
    </div>
  );
}

function ExportCard({
  title,
  description,
  actionLabel,
  onClick,
  disabled,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{description}</div>
      <button
        className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
        onClick={onClick}
        disabled={disabled}
        title={disabled ? "Coming soon" : undefined}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function mergeDvprRows(defaultRows: WizardState["dvpr"]["rows"], existingRows: WizardState["dvpr"]["rows"]) {
  if (!existingRows.length) return defaultRows;
  const byId = new Map(existingRows.map((row) => [row.id, row]));
  return defaultRows.map((row) => {
    const existing = byId.get(row.id);
    if (!existing) return row;
    const duration =
      typeof (existing as any).duration === "string"
        ? {
            value: Math.max(1, Math.round(parseFloat((existing as any).duration) || row.duration.value)),
            unit: "weeks" as const,
          }
        : existing.duration ?? row.duration;
    return { ...row, ...existing, duration, risk: row.risk };
  });
}

