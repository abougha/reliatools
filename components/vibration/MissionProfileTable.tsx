import React, { ChangeEvent } from "react";
import type { MissionState, PsdDefinition, ThermalCondition } from "@/lib/vibration/types";
import type { PsdTemplate } from "@/lib/vibration/types";
import { parsePsdCsv } from "@/lib/vibration/psd";

type MissionProfileTableProps = {
  states: MissionState[];
  psdTemplates: PsdTemplate[];
  activeStateId?: string;
  onSelectState?: (id: string) => void;
  onChange: (states: MissionState[]) => void;
  onAddState?: () => void;
  onRemoveState?: (id: string) => void;
};

export function MissionProfileTable({
  states,
  psdTemplates,
  activeStateId,
  onSelectState,
  onChange,
  onAddState,
  onRemoveState,
}: MissionProfileTableProps) {
  function updateState(id: string, patch: Partial<MissionState>) {
    onChange(states.map((state) => (state.id === id ? { ...state, ...patch } : state)));
  }

  function updatePsd(id: string, psd: PsdDefinition) {
    updateState(id, { psd });
  }

  function updateThermal(id: string, thermal: ThermalCondition) {
    updateState(id, { thermal });
  }

  function handlePsdTemplateChange(id: string, value: string, current: PsdDefinition) {
    if (value === "csv") {
      updatePsd(id, { kind: "Csv", name: "Uploaded PSD", points: [] });
      return;
    }
    const scale = current.kind === "Template" ? current.scale : 1;
    updatePsd(id, { kind: "Template", templateId: value, scale });
  }

  function handleCsvUpload(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const points = parsePsdCsv(text);
      updatePsd(id, { kind: "Csv", name: file.name, points });
    };
    reader.readAsText(file);
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Mission Profile States</h3>
          <p className="text-xs text-gray-500">Edit durations, PSD source, and thermal conditions.</p>
        </div>
        {onAddState && (
          <button
            type="button"
            onClick={onAddState}
            className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white"
          >
            Add state
          </button>
        )}
      </div>

      <div className="space-y-3">
        {states.map((state) => {
          const isActive = state.id === activeStateId;
          return (
            <div
              key={state.id}
              className={[
                "rounded-lg border p-3",
                isActive ? "border-blue-400 bg-blue-50/30" : "border-gray-200",
              ].join(" ")}
              onClick={() => onSelectState?.(state.id)}
            >
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                <div>
                  <label className="text-xs text-gray-500">Name</label>
                  <input
                    className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                    value={state.name}
                    onChange={(e) => updateState(state.id, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Duration (h)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                    value={state.duration_h}
                    onChange={(e) => updateState(state.id, { duration_h: Number(e.target.value) })}
                  />
                  <div className="mt-1 text-[11px] text-gray-400">default hours; typical range 100-50000</div>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-xs text-gray-500">PSD Source</label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-lg border px-2 py-1 text-sm"
                      value={state.psd.kind === "Template" ? state.psd.templateId : "csv"}
                      onChange={(e) => handlePsdTemplateChange(state.id, e.target.value, state.psd)}
                    >
                      {psdTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                      <option value="csv">CSV Upload</option>
                    </select>
                    {state.psd.kind === "Template" && (
                      <div>
                        <label className="text-[11px] text-gray-500">Scale</label>
                        <input
                          type="number"
                          step={0.05}
                          min={0}
                          className="mt-1 w-24 rounded-lg border px-2 py-1 text-sm"
                          value={state.psd.scale}
                          onChange={(e) =>
                            updatePsd(state.id, {
                              kind: "Template",
                              templateId: state.psd.templateId,
                              scale: Number(e.target.value),
                            })
                          }
                        />
                        <div className="text-[11px] text-gray-400">default 1.0; typical 0.5-2</div>
                      </div>
                    )}
                    {state.psd.kind === "Csv" && (
                      <div className="flex items-center gap-2">
                        <input type="file" accept=".csv,text/csv" onChange={(e) => handleCsvUpload(state.id, e)} />
                        <span className="text-[11px] text-gray-500">{state.psd.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Thermal</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                    value={state.thermal.kind}
                    onChange={(e) => {
                      const next = e.target.value as ThermalCondition["kind"];
                      if (next === "Steady") {
                        updateThermal(state.id, { kind: "Steady", T_C: 35 });
                      } else {
                        updateThermal(state.id, {
                          kind: "Cycle",
                          Tmin_C: 20,
                          Tmax_C: 70,
                          ramp_C_per_min: 2,
                          soak_min: 15,
                          cycles_per_hour: 1,
                        });
                      }
                    }}
                  >
                    <option value="Steady">Steady</option>
                    <option value="Cycle">Cycle</option>
                  </select>
                  {state.thermal.kind === "Steady" ? (
                    <div className="mt-2">
                      <label className="text-[11px] text-gray-500">T (C)</label>
                      <input
                        type="number"
                        step={1}
                        className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                        value={state.thermal.T_C}
                        onChange={(e) =>
                          updateThermal(state.id, { kind: "Steady", T_C: Number(e.target.value) })
                        }
                      />
                      <div className="text-[11px] text-gray-400">default 35; typical 20-85</div>
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <label className="text-gray-500">
                        Tmin (C)
                        <input
                          type="number"
                          className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                          value={state.thermal.Tmin_C}
                          onChange={(e) =>
                            updateThermal(state.id, {
                              ...state.thermal,
                              Tmin_C: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="text-gray-500">
                        Tmax (C)
                        <input
                          type="number"
                          className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                          value={state.thermal.Tmax_C}
                          onChange={(e) =>
                            updateThermal(state.id, {
                              ...state.thermal,
                              Tmax_C: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="text-gray-500">
                        Ramp (C/min)
                        <input
                          type="number"
                          step={0.1}
                          className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                          value={state.thermal.ramp_C_per_min}
                          onChange={(e) =>
                            updateThermal(state.id, {
                              ...state.thermal,
                              ramp_C_per_min: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="text-gray-500">
                        Soak (min)
                        <input
                          type="number"
                          className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                          value={state.thermal.soak_min}
                          onChange={(e) =>
                            updateThermal(state.id, {
                              ...state.thermal,
                              soak_min: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="text-gray-500">
                        Cycles/hr
                        <input
                          type="number"
                          step={0.1}
                          className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                          value={state.thermal.cycles_per_hour}
                          onChange={(e) =>
                            updateThermal(state.id, {
                              ...state.thermal,
                              cycles_per_hour: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
                {onRemoveState && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveState(state.id);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
