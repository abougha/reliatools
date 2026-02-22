"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DUTY_CYCLE_EXPORT_KEY, DUTY_CYCLE_ROUTE } from "@/lib/haltHass/types";
import EntryStep from "./EntryStep";
import ProfileBuilderStep from "./ProfileBuilderStep";
import Stepper from "./Stepper";
import StyleStep from "./StyleStep";
import type { EntryMode, HaltStyle, WizardState } from "./types";
import {
  applyDutyCycleImport,
  buildProfileTimeSeries,
  createInitialWizardState,
  getDetectionRobustnessScore,
  parseDutyCyclePayload,
} from "./utils";

export default function HALTWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(() => createInitialWizardState());
  const [showImportedBanner, setShowImportedBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = parseDutyCyclePayload(window.localStorage.getItem(DUTY_CYCLE_EXPORT_KEY));
    if (!payload) return;
    setState((prev) => applyDutyCycleImport(prev, payload));
    setShowImportedBanner(true);
  }, []);

  const detectionScore = useMemo(() => getDetectionRobustnessScore(state.detection), [state.detection]);
  const profileResult = useMemo(() => buildProfileTimeSeries(state), [state]);

  const hasImportedDutyCycle = showImportedBanner && Boolean(state.dutyCycleImport);

  function updateEntryMode(mode: EntryMode) {
    const defaultStyle: HaltStyle = mode === "detection" ? "classical" : "rapid";
    setState((prev) => ({ ...prev, entryMode: mode, haltStyle: defaultStyle }));
  }

  function openDutyCycleWizard() {
    router.push(DUTY_CYCLE_ROUTE);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">HALT/HASS Planning Wizard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Build HALT step-stress timelines with a detection-first or duty-cycle-driven entry path, then export CSV for chamber execution.
        </p>
        <div className="mt-3 rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
          MVP scope: HALT profile builder + chart + CSV export. HASS derivation is intentionally stubbed and will be expanded next.
        </div>
      </div>

      <Stepper currentStep={step} />

      {step === 1 ? (
        <EntryStep
          entryMode={state.entryMode}
          detection={state.detection}
          detectionScore={detectionScore}
          hasImportedDutyCycle={hasImportedDutyCycle}
          onEntryModeChange={updateEntryMode}
          onDetectionChange={(next) => setState((prev) => ({ ...prev, detection: next }))}
          onOpenDutyCycle={openDutyCycleWizard}
          onDismissImportedBanner={() => setShowImportedBanner(false)}
        />
      ) : null}

      {step === 2 ? (
        <StyleStep entryMode={state.entryMode} haltStyle={state.haltStyle} onStyleChange={(style) => setState((prev) => ({ ...prev, haltStyle: style }))} />
      ) : null}

      {step === 3 ? <ProfileBuilderStep state={state} result={profileResult} onStateChange={setState} /> : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          disabled={step === 1}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => Math.min(3, prev + 1))}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Restart at Step A
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
