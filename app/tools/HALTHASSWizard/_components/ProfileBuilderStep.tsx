"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ExportButtons from "./ExportButtons";
import ProfileChart from "./ProfileChart";
import type {
  BuildProfileResult,
  FailureEvent,
  GenericLaneProfile,
  LaneKey,
  LaneStepConfig,
  NumericInput,
  WizardState,
} from "./types";
import { createDefaultEvent, numberOrNull, parseNumericInput } from "./utils";

type ProfileBuilderStepProps = {
  state: WizardState;
  result: BuildProfileResult;
  onStateChange: (next: WizardState) => void;
};

const laneLabels: Record<LaneKey, string> = {
  temp: "Temperature",
  vib: "Vibration",
  humidity: "Humidity",
  voltage: "Voltage",
  power: "Power Cycling",
};

function NumericField({
  label,
  value,
  onChange,
  step = "any",
  min,
}: {
  label: string;
  value: NumericInput;
  onChange: (value: NumericInput) => void;
  step?: number | "any";
  min?: number;
}) {
  return (
    <label className="text-xs text-gray-700">
      <div className="mb-1">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(parseNumericInput(event.target.value))}
        className="w-full rounded border px-2 py-1.5 text-sm"
        step={step}
        min={min}
      />
    </label>
  );
}

function CommonLaneFields({
  title,
  config,
  onChange,
}: {
  title: string;
  config: LaneStepConfig;
  onChange: (next: LaneStepConfig) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h5 className="text-sm font-semibold text-gray-900">{title}</h5>
        <span className="text-[11px] text-gray-500">Max limit overrides step count when both are set.</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NumericField label="Start level" value={config.start} onChange={(value) => onChange({ ...config, start: value })} />
        <NumericField label="Step size" value={config.step} onChange={(value) => onChange({ ...config, step: value })} min={0} />
        <NumericField label="Dwell (min)" value={config.dwellMin} onChange={(value) => onChange({ ...config, dwellMin: value })} min={0} />
        <NumericField
          label="Number of steps"
          value={config.steps}
          onChange={(value) => onChange({ ...config, steps: value })}
          min={1}
          step={1}
        />
        <NumericField
          label="Max limit"
          value={config.maxLimit}
          onChange={(value) => onChange({ ...config, maxLimit: value })}
        />
        <NumericField
          label="Ramp rate (optional)"
          value={config.rampRate}
          onChange={(value) => onChange({ ...config, rampRate: value })}
          min={0}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.stopOnFirstFail}
            onChange={(event) => onChange({ ...config, stopOnFirstFail: event.target.checked })}
          />
          Stop on first fail
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.continueAfterFail}
            onChange={(event) => onChange({ ...config, continueAfterFail: event.target.checked })}
          />
          Continue after fail
        </label>
      </div>
    </div>
  );
}

export default function ProfileBuilderStep({ state, result, onStateChange }: ProfileBuilderStepProps) {
  const hasDutySuggestions = Boolean(state.dutyCycleImport);
  const [eventDraft, setEventDraft] = useState<FailureEvent>(createDefaultEvent());

  function updateLaneEnabled(lane: LaneKey, enabled: boolean) {
    if (lane === "temp") return;
    onStateChange({
      ...state,
      lanesEnabled: { ...state.lanesEnabled, [lane]: enabled },
    });
  }

  function updateProfileLane<K extends keyof WizardState["profile"]>(lane: K, nextValue: WizardState["profile"][K]) {
    onStateChange({
      ...state,
      profile: {
        ...state.profile,
        [lane]: nextValue,
      },
    });
  }

  function addEvent() {
    const timeMin = numberOrNull(eventDraft.timeMin);
    if (timeMin === null || timeMin < 0) return;
    onStateChange({
      ...state,
      events: [...state.events, { ...eventDraft, id: eventDraft.id, note: eventDraft.note.trim() }],
    });
    setEventDraft(createDefaultEvent());
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Stress lanes</h3>
          {hasDutySuggestions ? <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Suggested (editable)</span> : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {(["temp", "vib", "humidity", "voltage", "power"] as LaneKey[]).map((lane) => (
            <label key={lane} className="inline-flex items-center gap-2 rounded border bg-gray-50 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={lane === "temp" ? true : state.lanesEnabled[lane]}
                onChange={(event) => updateLaneEnabled(lane, event.target.checked)}
                disabled={lane === "temp"}
              />
              {laneLabels[lane]}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Lane configurations</h3>
          <span className="text-xs text-gray-500">HALT style: {state.haltStyle}</span>
        </div>

        <CommonLaneFields
          title="Temperature: Cold step phase"
          config={state.profile.temperature.cold}
          onChange={(next) =>
            updateProfileLane("temperature", {
              ...state.profile.temperature,
              cold: next,
            })
          }
        />
        <CommonLaneFields
          title="Temperature: Hot step phase"
          config={state.profile.temperature.hot}
          onChange={(next) =>
            updateProfileLane("temperature", {
              ...state.profile.temperature,
              hot: next,
            })
          }
        />

        <div className="rounded-lg border p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h5 className="text-sm font-semibold text-gray-900">Temperature Rapid Thermal Cycling (RTC)</h5>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.profile.temperature.rtc.enabled}
                onChange={(event) =>
                  updateProfileLane("temperature", {
                    ...state.profile.temperature,
                    rtc: { ...state.profile.temperature.rtc, enabled: event.target.checked },
                  })
                }
              />
              Enable RTC
            </label>
          </div>
          {state.profile.temperature.rtc.enabled ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <NumericField
                label="Tmin"
                value={state.profile.temperature.rtc.tMin}
                onChange={(value) =>
                  updateProfileLane("temperature", {
                    ...state.profile.temperature,
                    rtc: { ...state.profile.temperature.rtc, tMin: value },
                  })
                }
              />
              <NumericField
                label="Tmax"
                value={state.profile.temperature.rtc.tMax}
                onChange={(value) =>
                  updateProfileLane("temperature", {
                    ...state.profile.temperature,
                    rtc: { ...state.profile.temperature.rtc, tMax: value },
                  })
                }
              />
              <NumericField
                label="Cycles"
                value={state.profile.temperature.rtc.cycles}
                onChange={(value) =>
                  updateProfileLane("temperature", {
                    ...state.profile.temperature,
                    rtc: { ...state.profile.temperature.rtc, cycles: value },
                  })
                }
                min={1}
                step={1}
              />
              <NumericField
                label="Dwell/extreme (min)"
                value={state.profile.temperature.rtc.dwellPerExtremeMin}
                onChange={(value) =>
                  updateProfileLane("temperature", {
                    ...state.profile.temperature,
                    rtc: { ...state.profile.temperature.rtc, dwellPerExtremeMin: value },
                  })
                }
              />
              <NumericField
                label="Ramp rate (degC/min)"
                value={state.profile.temperature.rtc.rampRate}
                onChange={(value) =>
                  updateProfileLane("temperature", {
                    ...state.profile.temperature,
                    rtc: { ...state.profile.temperature.rtc, rampRate: value },
                  })
                }
              />
            </div>
          ) : (
            <p className="text-sm text-gray-600">Optional thermal cycle block between cold/hot stress phases.</p>
          )}
        </div>

        {state.lanesEnabled.vib ? (
          <div className="space-y-3">
            <CommonLaneFields
              title="Vibration lane"
              config={state.profile.vibration}
              onChange={(next) => updateProfileLane("vibration", { ...state.profile.vibration, ...next })}
            />
            <div className="rounded-lg border p-3">
              <NumericField
                label="Tickle vibration (gRMS)"
                value={state.profile.vibration.tickleGrms}
                onChange={(value) => updateProfileLane("vibration", { ...state.profile.vibration, tickleGrms: value })}
                min={0}
              />
            </div>
          </div>
        ) : null}

        {state.lanesEnabled.humidity ? (
          <CommonLaneFields
            title="Humidity lane"
            config={state.profile.humidity}
            onChange={(next) => updateProfileLane("humidity", next as GenericLaneProfile)}
          />
        ) : null}
        {state.lanesEnabled.voltage ? (
          <CommonLaneFields
            title="Voltage lane"
            config={state.profile.voltage}
            onChange={(next) => updateProfileLane("voltage", next as GenericLaneProfile)}
          />
        ) : null}
        {state.lanesEnabled.power ? (
          <CommonLaneFields
            title="Power cycling lane"
            config={state.profile.power}
            onChange={(next) => updateProfileLane("power", next as GenericLaneProfile)}
          />
        ) : null}

        {state.haltStyle === "classical" ? (
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h5 className="text-sm font-semibold text-gray-900">Classical combined phase</h5>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.profile.temperature.combinedPhaseEnabled}
                  onChange={(event) =>
                    updateProfileLane("temperature", {
                      ...state.profile.temperature,
                      combinedPhaseEnabled: event.target.checked,
                    })
                  }
                />
                Enable after individual phases
              </label>
            </div>
            {state.profile.temperature.combinedPhaseEnabled ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NumericField
                  label="Combined phase steps"
                  value={state.profile.temperature.combined.steps}
                  onChange={(value) =>
                    updateProfileLane("temperature", {
                      ...state.profile.temperature,
                      combined: { ...state.profile.temperature.combined, steps: value },
                    })
                  }
                  min={1}
                  step={1}
                />
                <NumericField
                  label="Combined dwell (min)"
                  value={state.profile.temperature.combined.dwellMin}
                  onChange={(value) =>
                    updateProfileLane("temperature", {
                      ...state.profile.temperature,
                      combined: { ...state.profile.temperature.combined, dwellMin: value },
                    })
                  }
                  min={0}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
            Rapid HALT mode builds a direct combined-stress escalation timeline across enabled lanes.
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Failure events</h3>
          <span className="text-xs text-gray-500">Markers show as reference lines + dots in each lane chart.</span>
        </div>
        <div className="grid grid-cols-1 gap-2 rounded-lg border bg-gray-50 p-3 md:grid-cols-[0.8fr_0.9fr_0.9fr_1.8fr_auto]">
          <input
            type="number"
            placeholder="Time (min)"
            value={eventDraft.timeMin}
            onChange={(event) => setEventDraft((prev) => ({ ...prev, timeMin: parseNumericInput(event.target.value) }))}
            className="rounded border px-2 py-2 text-sm"
          />
          <select
            value={eventDraft.lane}
            onChange={(event) => setEventDraft((prev) => ({ ...prev, lane: event.target.value as LaneKey }))}
            className="rounded border px-2 py-2 text-sm"
          >
            {(["temp", "vib", "humidity", "voltage", "power"] as LaneKey[]).map((lane) => (
              <option key={lane} value={lane}>
                {laneLabels[lane]}
              </option>
            ))}
          </select>
          <select
            value={eventDraft.type}
            onChange={(event) => setEventDraft((prev) => ({ ...prev, type: event.target.value as FailureEvent["type"] }))}
            className="rounded border px-2 py-2 text-sm"
          >
            <option value="hard">Hard</option>
            <option value="parametric">Parametric</option>
            <option value="intermittent">Intermittent</option>
          </select>
          <input
            type="text"
            placeholder="Note"
            value={eventDraft.note}
            onChange={(event) => setEventDraft((prev) => ({ ...prev, note: event.target.value }))}
            className="rounded border px-2 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addEvent}
            className="inline-flex items-center justify-center gap-1 rounded border px-3 py-2 text-sm font-medium hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        {state.events.length > 0 ? (
          <div className="mt-3 space-y-2">
            {state.events.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                <span>
                  t={event.timeMin} min | {laneLabels[event.lane]} | {event.type} | {event.note || "No note"}
                </span>
                <button
                  type="button"
                  onClick={() => onStateChange({ ...state, events: state.events.filter((row) => row.id !== event.id) })}
                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">No failure events added yet.</p>
        )}
      </div>

      {result.validationErrors.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-red-800">Fix profile inputs before export</h4>
          <ul className="space-y-1 text-sm text-red-700">
            {result.validationErrors.map((error, index) => (
              <li key={`${error}-${index}`}>- {error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Graphical HALT profile</h3>
          <ExportButtons rows={result.csvRows} disabled={result.validationErrors.length > 0} />
        </div>
        <ProfileChart data={result.chartData} lanesEnabled={state.lanesEnabled} events={state.events} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Summary</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded border bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total duration</div>
              <div className="text-lg font-semibold text-gray-900">{result.summary.totalDurationMin.toFixed(2)} min</div>
            </div>
            {Object.entries(result.summary.ranges).map(([lane, range]) => (
              <div key={lane} className="rounded border bg-gray-50 p-3">
                <div className="text-xs text-gray-500">{laneLabels[lane as LaneKey]} range</div>
                <div className="text-sm font-semibold text-gray-900">
                  {range?.min.toFixed(3).replace(/\.?0+$/, "")} to {range?.max.toFixed(3).replace(/\.?0+$/, "")}
                </div>
              </div>
            ))}
            <div className="rounded border bg-gray-50 p-3 sm:col-span-2 lg:col-span-3">
              <div className="text-xs text-gray-500">First failure</div>
              <div className="text-sm font-semibold text-gray-900">
                {result.summary.firstFailure
                  ? `t=${result.summary.firstFailure.timeMin.toFixed(2)} min, ${laneLabels[result.summary.firstFailure.lane]} (${result.summary.firstFailure.type})`
                  : "No failure events logged"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">HASS Derivation</h3>
          <p className="text-sm text-gray-700">
            Coming next: transform discovered HALT margins into production HASS screen windows with guardband recommendations.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-gray-600">
            <li>Planned: screen-limit suggestions from first-failure margins.</li>
            <li>Planned: exit criteria and audit-ready rationale output.</li>
            <li>Planned: throughput and screen-time trade-off estimator.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
