"use client";

import { ExternalLink, Plus, Radar, Trash2, Workflow } from "lucide-react";
import { DUTY_CYCLE_ROUTE } from "@/lib/haltHass/types";
import type { DetectionConfig, EntryMode, FailureEventType, ThresholdType } from "./types";
import { createDefaultSignal, getScoreTone, parseNumericInput } from "./utils";

type EntryStepProps = {
  entryMode: EntryMode;
  detection: DetectionConfig;
  detectionScore: number;
  hasImportedDutyCycle: boolean;
  onEntryModeChange: (mode: EntryMode) => void;
  onDetectionChange: (next: DetectionConfig) => void;
  onOpenDutyCycle: () => void;
  onDismissImportedBanner: () => void;
};

const failureTypeLabels: Array<{ key: FailureEventType; label: string }> = [
  { key: "hard", label: "Hard fail" },
  { key: "parametric", label: "Parametric drift" },
  { key: "intermittent", label: "Intermittent" },
];

const thresholdTypeOptions: ThresholdType[] = [">", "<", "±", "window"];

function ScoreBadge({ score }: { score: number }) {
  const tone = getScoreTone(score);
  const classes =
    tone === "green"
      ? "bg-green-100 text-green-800 border-green-200"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>Score {score}/100</span>;
}

export default function EntryStep({
  entryMode,
  detection,
  detectionScore,
  hasImportedDutyCycle,
  onEntryModeChange,
  onDetectionChange,
  onOpenDutyCycle,
  onDismissImportedBanner,
}: EntryStepProps) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onEntryModeChange("detection")}
          className={[
            "rounded-2xl border p-5 text-left transition",
            entryMode === "detection" ? "border-blue-300 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300",
          ].join(" ")}
        >
          <div className="mb-3 flex items-center gap-2">
            <Radar className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Detection-first</h3>
          </div>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>Define failure indicators and thresholds.</li>
            <li>Score detection robustness before stressing harder.</li>
            <li>Good fit when instrumentation is the main risk.</li>
          </ul>
        </button>

        <button
          type="button"
          onClick={() => onEntryModeChange("dutyCycle")}
          className={[
            "rounded-2xl border p-5 text-left transition",
            entryMode === "dutyCycle" ? "border-blue-300 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300",
          ].join(" ")}
        >
          <div className="mb-3 flex items-center gap-2">
            <Workflow className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Duty-cycle driven</h3>
          </div>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>Import stress ranges from the Duty Cycle Wizard.</li>
            <li>Auto-propose HALT envelope and stepping heuristics.</li>
            <li>Good fit for mission-profile-led planning.</li>
          </ul>
        </button>
      </div>

      {entryMode === "detection" ? (
        <div className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Detection Configuration</h3>
            <ScoreBadge score={detectionScore} />
          </div>

          {detectionScore < 50 ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Detection robustness is low. Proceeding is allowed, but coverage gaps can hide intermittent or parametric failures.
            </div>
          ) : null}

          <div className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Failure types</div>
            <div className="flex flex-wrap gap-3">
              {failureTypeLabels.map((item) => (
                <label key={item.key} className="inline-flex items-center gap-2 rounded border bg-gray-50 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={detection.failureTypes[item.key]}
                    onChange={(event) =>
                      onDetectionChange({
                        ...detection,
                        failureTypes: { ...detection.failureTypes, [item.key]: event.target.checked },
                      })
                    }
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Detection signals</div>
            <div className="space-y-3">
              {detection.signals.map((signal, index) => (
                <div key={signal.id} className="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_auto]">
                  <input
                    type="text"
                    value={signal.name}
                    onChange={(event) => {
                      const nextSignals = detection.signals.map((row) =>
                        row.id === signal.id ? { ...row, name: event.target.value } : row
                      );
                      onDetectionChange({ ...detection, signals: nextSignals });
                    }}
                    placeholder={`Signal ${index + 1} name`}
                    className="rounded border px-2 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={signal.units}
                    onChange={(event) => {
                      const nextSignals = detection.signals.map((row) =>
                        row.id === signal.id ? { ...row, units: event.target.value } : row
                      );
                      onDetectionChange({ ...detection, signals: nextSignals });
                    }}
                    placeholder="Units"
                    className="rounded border px-2 py-2 text-sm"
                  />
                  <select
                    value={signal.thresholdType}
                    onChange={(event) => {
                      const nextSignals = detection.signals.map((row) =>
                        row.id === signal.id ? { ...row, thresholdType: event.target.value as ThresholdType } : row
                      );
                      onDetectionChange({ ...detection, signals: nextSignals });
                    }}
                    className="rounded border px-2 py-2 text-sm"
                  >
                    {thresholdTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={signal.thresholdValue}
                    onChange={(event) => {
                      const nextSignals = detection.signals.map((row) =>
                        row.id === signal.id ? { ...row, thresholdValue: parseNumericInput(event.target.value) } : row
                      );
                      onDetectionChange({ ...detection, signals: nextSignals });
                    }}
                    placeholder="Threshold"
                    className="rounded border px-2 py-2 text-sm"
                  />
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded border text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    disabled={detection.signals.length <= 1}
                    onClick={() =>
                      onDetectionChange({
                        ...detection,
                        signals: detection.signals.filter((row) => row.id !== signal.id),
                      })
                    }
                    aria-label="Remove signal row"
                    title="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onDetectionChange({ ...detection, signals: [...detection.signals, createDefaultSignal()] })}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <Plus className="h-4 w-4" />
                Add signal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-gray-700">Sample interval (sec)</div>
              <input
                type="number"
                value={detection.sampleIntervalSec}
                onChange={(event) =>
                  onDetectionChange({
                    ...detection,
                    sampleIntervalSec: parseNumericInput(event.target.value),
                  })
                }
                className="w-full rounded border px-2 py-2"
                min={0}
                step="0.1"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-gray-700">Log duration (min)</div>
              <input
                type="number"
                value={detection.logDurationMin}
                onChange={(event) =>
                  onDetectionChange({
                    ...detection,
                    logDurationMin: parseNumericInput(event.target.value),
                  })
                }
                className="w-full rounded border px-2 py-2"
                min={0}
                step="1"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-4">
          {hasImportedDutyCycle ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <span>Imported duty cycle detected and HALT suggestions were applied.</span>
              <button type="button" onClick={onDismissImportedBanner} className="rounded border border-green-300 px-2 py-1 text-xs">
                Dismiss
              </button>
            </div>
          ) : null}

          <div className="mb-3 rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
            Import mission-profile stress ranges, then refine the proposed HALT envelope and step pacing.
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenDutyCycle}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Open Duty Cycle Wizard
              <ExternalLink className="h-4 w-4" />
            </button>
            <a
              href={DUTY_CYCLE_ROUTE}
              className="inline-flex items-center rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Go to Mission Profile Builder
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
