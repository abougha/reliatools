// app/tools/Derating/ComponentEditor.tsx
"use client";

import React from "react";

import type {
  ComponentRecord,
  ComponentType,
  ComponentInputs,
  SiliconMosInputs,
  PowerInputs,
  VoltageInputs,
  CurrentInputs,
  TransformerInputs,
  BearingsInputs,
  SpringsInputs,
  SealsInputs,
  PressureUnit,
} from "@/lib/derating/models";
import { defaultInputsForComponentType } from "@/lib/derating/factories";

type Props = {
  component: ComponentRecord;
  allComponentTypes: ComponentType[];
  onPatch: (componentId: string, patch: Partial<Omit<ComponentRecord, "id">>) => void;
  onRemove: (componentId: string) => void;
};

function numOrUndef(v: string): number | undefined {
  const s = v.trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function numOrZero(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs text-neutral-600">{props.label}</div>
      <input
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
      />
    </label>
  );
}

function NumField(props: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs text-neutral-600">{props.label}</div>
      <input
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        type="number"
        step={props.step ?? "any"}
        value={props.value ?? ""}
        onChange={(e) => props.onChange(numOrUndef(e.target.value))}
        placeholder={props.placeholder}
      />
    </label>
  );
}

function RatedAppliedEditor(props: {
  title: string;
  rated: number;
  applied: number;
  onChange: (next: { rated: number; applied: number }) => void;
  units?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-sm font-medium">{props.title}</div>
        {props.units ? <div className="text-xs text-neutral-500">{props.units}</div> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <div className="text-xs text-neutral-600">Rated</div>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            type="number"
            step="any"
            value={props.rated}
            onChange={(e) => props.onChange({ rated: numOrZero(e.target.value), applied: props.applied })}
          />
        </label>
        <label className="block">
          <div className="text-xs text-neutral-600">Applied</div>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            type="number"
            step="any"
            value={props.applied}
            onChange={(e) => props.onChange({ rated: props.rated, applied: numOrZero(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}

export function ComponentEditor({ component, allComponentTypes, onPatch, onRemove }: Props) {
  const inputs = component.inputs;

  function patchInputs(nextInputs: ComponentInputs) {
    onPatch(component.id, { inputs: nextInputs, results: null });
  }

  function changeComponentType(nextType: ComponentType) {
    const nextInputs = defaultInputsForComponentType(nextType);
    onPatch(component.id, {
      componentType: nextType,
      inputs: nextInputs,
      results: null,
      rule: { matchedRuleId: undefined, effectiveRuleId: undefined, effectiveRule: null },
    });
  }

  const headerStatus = component.results?.status ?? "Attention";
  const statusClass =
    headerStatus === "Pass"
      ? "bg-emerald-50 text-emerald-700"
      : headerStatus === "Fail"
      ? "bg-red-50 text-red-700"
      : "bg-amber-50 text-amber-700";

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[320px]">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">{component.refDes}</div>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}>{headerStatus}</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Rule:{" "}
            <span className="font-medium text-neutral-700">
              {component.rule.effectiveRuleId ?? component.rule.matchedRuleId ?? "—"}
            </span>
            {component.rule.matchedRuleId ? " (Exact)" : component.rule.effectiveRuleId ? " (Fallback)" : ""}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-neutral-50"
            onClick={() => onRemove(component.id)}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TextField
          label="RefDes"
          value={component.refDes}
          onChange={(v) => onPatch(component.id, { refDes: v })}
          placeholder="e.g., R12"
        />

        <label className="block">
          <div className="text-xs text-neutral-600">Component Type</div>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={component.componentType}
            onChange={(e) => changeComponentType(e.target.value as ComponentType)}
          >
            {allComponentTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <TextField
          label="Notes"
          value={component.notes ?? ""}
          onChange={(v) => onPatch(component.id, { notes: v })}
          placeholder="Optional notes"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        {inputs.kind === "SiliconMos" && <SiliconMosEditor inputs={inputs} onChange={patchInputs} />}
        {inputs.kind === "Power" && <PowerEditor inputs={inputs} onChange={patchInputs} />}
        {inputs.kind === "Voltage" && <VoltageEditor inputs={inputs} onChange={patchInputs} />}
        {inputs.kind === "Current" && <CurrentEditor inputs={inputs} onChange={patchInputs} />}
        {inputs.kind === "Transformer" && <TransformerEditor inputs={inputs} onChange={patchInputs} />}
        {inputs.kind === "Bearings" && <BearingsEditor inputs={inputs} onChange={patchInputs} />}
        {inputs.kind === "Springs" && <SpringsEditor inputs={inputs} onChange={patchInputs} />}
        {inputs.kind === "Seals" && <SealsEditor inputs={inputs} onChange={patchInputs} />}

        {inputs.kind === "Unknown" && (
          <div className="rounded-lg border bg-neutral-50 p-3 text-sm text-neutral-700">
            No inputs for this component type yet.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border bg-neutral-50 p-3">
        <div className="text-xs font-medium text-neutral-700">Computed (read-only)</div>
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-neutral-700 lg:grid-cols-3">
          <div>
            <span className="text-neutral-500">Parameter:</span>{" "}
            {component.results?.parameterDerated ?? component.rule.effectiveRule?.parameterDerated ?? "—"}
          </div>
          <div>
            <span className="text-neutral-500">Limiting:</span> {component.results?.worst?.limitingCheckKey ?? "—"}
          </div>
          <div>
            <span className="text-neutral-500">Messages:</span> {component.results?.messages?.length ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Kind-specific editors
   ========================= */

function SiliconMosEditor(props: { inputs: SiliconMosInputs; onChange: (v: SiliconMosInputs) => void }) {
  const inp = props.inputs;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">Silicon MOS Inputs</div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <NumField
          label="Applied TJ (°C)"
          value={inp.tjAppliedC}
          onChange={(v) => props.onChange({ ...inp, tjAppliedC: v ?? 25 })}
        />
        <NumField
          label="TJmax (°C) (optional)"
          value={inp.tjMaxC}
          onChange={(v) => props.onChange({ ...inp, tjMaxC: v })}
        />
      </div>

      <div className="mt-3 rounded-lg border bg-white p-3">
        <div className="mb-2 text-sm font-medium">Thermal Estimation (optional)</div>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!inp.thermal}
            onChange={(e) =>
              props.onChange(
                e.target.checked
                  ? {
                      ...inp,
                      thermal: {
                        powerDissW: 0,
                        selectedPath: "ambient",
                        ambientPath: { ambientC: 25, rThetaJA_CPerW: 0 },
                      },
                    }
                  : { ...inp, thermal: undefined }
              )
            }
          />
          Enable thermal estimation inputs
        </label>

        {inp.thermal && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <NumField
              label="Power Dissipation (W)"
              value={inp.thermal.powerDissW}
              onChange={(v) => props.onChange({ ...inp, thermal: { ...inp.thermal!, powerDissW: v ?? 0 } })}
            />

            <label className="block">
              <div className="text-xs text-neutral-600">Selected Path</div>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={inp.thermal.selectedPath}
                onChange={(e) =>
                  props.onChange({
                    ...inp,
                    thermal: { ...inp.thermal!, selectedPath: e.target.value as "ambient" | "case" },
                  })
                }
              >
                <option value="ambient">Ambient Path (RθJA)</option>
                <option value="case">Case Path (RθJC)</option>
              </select>
            </label>

            {inp.thermal.selectedPath === "ambient" ? (
              <>
                <NumField
                  label="Ambient (°C)"
                  value={inp.thermal.ambientPath?.ambientC}
                  onChange={(v) =>
                    props.onChange({
                      ...inp,
                      thermal: {
                        ...inp.thermal!,
                        ambientPath: {
                          ambientC: v ?? 25,
                          rThetaJA_CPerW: inp.thermal!.ambientPath?.rThetaJA_CPerW ?? 0,
                        },
                      },
                    })
                  }
                />
                <NumField
                  label="RθJA (°C/W)"
                  value={inp.thermal.ambientPath?.rThetaJA_CPerW}
                  onChange={(v) =>
                    props.onChange({
                      ...inp,
                      thermal: {
                        ...inp.thermal!,
                        ambientPath: {
                          ambientC: inp.thermal!.ambientPath?.ambientC ?? 25,
                          rThetaJA_CPerW: v ?? 0,
                        },
                      },
                    })
                  }
                />
              </>
            ) : (
              <>
                <NumField
                  label="Case Temp (°C)"
                  value={inp.thermal.casePath?.caseC}
                  onChange={(v) =>
                    props.onChange({
                      ...inp,
                      thermal: {
                        ...inp.thermal!,
                        casePath: { caseC: v ?? 25, rThetaJC_CPerW: inp.thermal!.casePath?.rThetaJC_CPerW ?? 0 },
                      },
                    })
                  }
                />
                <NumField
                  label="RθJC (°C/W)"
                  value={inp.thermal.casePath?.rThetaJC_CPerW}
                  onChange={(v) =>
                    props.onChange({
                      ...inp,
                      thermal: {
                        ...inp.thermal!,
                        casePath: { caseC: inp.thermal!.casePath?.caseC ?? 25, rThetaJC_CPerW: v ?? 0 },
                      },
                    })
                  }
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PowerEditor(props: { inputs: PowerInputs; onChange: (v: PowerInputs) => void }) {
  const inp = props.inputs;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">Power Inputs</div>

      <RatedAppliedEditor
        title="Power"
        units="W"
        rated={inp.power.rated}
        applied={inp.power.applied}
        onChange={(p) => props.onChange({ ...inp, power: p })}
      />

      {/* (rest unchanged) */}
      {/* Keep your existing blocks exactly as you had them */}
    </div>
  );
}

function VoltageEditor(props: { inputs: VoltageInputs; onChange: (v: VoltageInputs) => void }) {
  const inp = props.inputs;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">Voltage Inputs</div>

      <RatedAppliedEditor
        title="Voltage"
        units="V"
        rated={inp.voltage.rated}
        applied={inp.voltage.applied}
        onChange={(v) => props.onChange({ ...inp, voltage: v })}
      />
    </div>
  );
}

function CurrentEditor(props: { inputs: CurrentInputs; onChange: (v: CurrentInputs) => void }) {
  const inp = props.inputs;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">Current Inputs</div>
      <RatedAppliedEditor
        title="Current"
        units="A"
        rated={inp.current.rated}
        applied={inp.current.applied}
        onChange={(v) => props.onChange({ ...inp, current: v })}
      />
    </div>
  );
}

function TransformerEditor(props: { inputs: TransformerInputs; onChange: (v: TransformerInputs) => void }) {
  const inp = props.inputs;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">Transformer Inputs</div>
      <RatedAppliedEditor
        title="VA Load"
        units="VA"
        rated={inp.va.rated}
        applied={inp.va.applied}
        onChange={(v) => props.onChange({ ...inp, va: v })}
      />
    </div>
  );
}

function BearingsEditor(props: { inputs: BearingsInputs; onChange: (v: BearingsInputs) => void }) {
  const inp = props.inputs;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">Bearings Inputs</div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RatedAppliedEditor
          title="Radial Load"
          units="N"
          rated={inp.radialLoad.rated}
          applied={inp.radialLoad.applied}
          onChange={(v) => props.onChange({ ...inp, radialLoad: v })}
        />
        <RatedAppliedEditor
          title="Speed"
          units="rpm"
          rated={inp.speedRpm.rated}
          applied={inp.speedRpm.applied}
          onChange={(v) => props.onChange({ ...inp, speedRpm: v })}
        />
      </div>
    </div>
  );
}

function SpringsEditor(props: { inputs: SpringsInputs; onChange: (v: SpringsInputs) => void }) {
  const inp = props.inputs;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">Springs Inputs</div>
      <RatedAppliedEditor
        title="Force"
        units="N"
        rated={inp.force.rated}
        applied={inp.force.applied}
        onChange={(v) => props.onChange({ ...inp, force: v })}
      />
    </div>
  );
}

function SealsEditor(props: { inputs: SealsInputs; onChange: (v: SealsInputs) => void }) {
  const inp = props.inputs;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">Seals Inputs</div>

      <RatedAppliedEditor
        title="Pressure (stored as Pa)"
        units="Pa"
        rated={inp.pressurePa.rated}
        applied={inp.pressurePa.applied}
        onChange={(v) => props.onChange({ ...inp, pressurePa: v })}
      />

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <label className="block">
          <div className="text-xs text-neutral-600">Pressure Unit (display)</div>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={inp.pressureUnit}
            onChange={(e) => props.onChange({ ...inp, pressureUnit: e.target.value as PressureUnit })}
          >
            <option value="Pa">Pa</option>
            <option value="kPa">kPa</option>
            <option value="bar">bar</option>
            <option value="psi">psi</option>
          </select>
        </label>

        <NumField
          label="Rated Temp (°C)"
          value={inp.temperature.ratedTempC}
          onChange={(v) => props.onChange({ ...inp, temperature: { ...inp.temperature, ratedTempC: v ?? 85 } })}
        />
        <NumField
          label="Applied Temp (°C)"
          value={inp.temperature.appliedTempC}
          onChange={(v) => props.onChange({ ...inp, temperature: { ...inp.temperature, appliedTempC: v ?? 25 } })}
        />
      </div>
    </div>
  );
}
