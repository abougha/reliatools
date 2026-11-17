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
import { formatSig } from "@/lib/format";

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

      <ComponentResultPanel component={component} />
    </div>
  );
}

/* =========================
   Result panel
   ========================= */

const num = (v: number | null | undefined, sig = 4) =>
  typeof v === "number" && Number.isFinite(v) ? formatSig(v, sig) : "—";

const pct = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : "—";

const statusTextClass = (status: string) =>
  status === "Pass" ? "text-emerald-700" : status === "Fail" ? "text-red-700" : "text-amber-700";

/** Shows why a component passes or fails: each check with its numbers, plus any messages. */
function ComponentResultPanel({ component }: { component: ComponentRecord }) {
  const results = component.results;
  const checks = Object.entries(results?.checks ?? {});
  const thermal = results?.thermal;
  const messages = results?.messages ?? [];
  const hasThermal = !!thermal && thermal.model !== "None" && typeof thermal.estimatedTempC === "number";

  return (
    <div className="mt-4 rounded-lg border bg-neutral-50 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-medium text-neutral-800">Result</div>
        <div className="text-xs text-neutral-500">
          Derated parameter:{" "}
          <span className="text-neutral-700">
            {results?.parameterDerated ?? component.rule.effectiveRule?.parameterDerated ?? "—"}
          </span>
        </div>
      </div>

      {checks.length === 0 && !hasThermal ? (
        <p className="mt-2 text-xs text-neutral-600">
          No result yet. Enter the rated and applied values above.
        </p>
      ) : null}

      {checks.length > 0 ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs text-neutral-700">
            <thead className="text-neutral-500">
              <tr>
                <th className="py-1 pr-3 font-medium">Check</th>
                <th className="py-1 pr-3 font-medium">Applied</th>
                <th className="py-1 pr-3 font-medium">Rated</th>
                <th className="py-1 pr-3 font-medium">Allowed after derating</th>
                <th className="py-1 pr-3 font-medium">Margin left</th>
                <th className="py-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {checks.map(([key, check]) => (
                <tr key={key} className="border-t border-neutral-200">
                  <td className="py-1 pr-3">
                    {key}
                    {check.note ? <div className="text-neutral-500">{check.note}</div> : null}
                  </td>
                  <td className="py-1 pr-3 tabular-nums">{num(check.applied)}</td>
                  <td className="py-1 pr-3 tabular-nums">{num(check.rated)}</td>
                  <td className="py-1 pr-3 tabular-nums">
                    {check.derated ? num(check.derated.allowed) : "no derating rule"}
                    {check.derated && typeof check.df === "number" ? (
                      <span className="text-neutral-500"> ({pct(check.df)} of rated)</span>
                    ) : null}
                  </td>
                  <td className="py-1 pr-3 tabular-nums">{pct(check.derated?.dmDerated ?? check.margin?.dm)}</td>
                  <td className={`py-1 font-medium ${statusTextClass(check.status)}`}>{check.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {results && results.status !== "Pass" && checks.length > 0 && checks.every(([, check]) => check.status === "Pass") ? (
        <p className="mt-2 text-xs text-amber-700">
          Each check is within its derated limit, but the margin left is smaller than the pass targets on the Setup tab,
          so this part is marked {results.status}.
        </p>
      ) : null}

      {hasThermal && thermal ? (
        <p className="mt-2 text-xs text-neutral-700">
          Estimated temperature {num(thermal.estimatedTempC)}°C
          {typeof thermal.limitC === "number" ? `, limit ${num(thermal.limitC)}°C` : ""}
          {typeof thermal.marginC === "number" ? `, margin ${num(thermal.marginC)}°C` : ""}
          {thermal.status ? (
            <span className={`ml-1 font-medium ${statusTextClass(thermal.status)}`}>({thermal.status})</span>
          ) : null}
        </p>
      ) : null}

      {messages.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs">
          {messages.map((message, index) => (
            <li
              key={`${index}-${message.text}`}
              className={
                message.level === "error"
                  ? "text-red-700"
                  : message.level === "warning"
                    ? "text-amber-700"
                    : "text-neutral-600"
              }
            >
              {message.text}
            </li>
          ))}
        </ul>
      ) : null}
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
